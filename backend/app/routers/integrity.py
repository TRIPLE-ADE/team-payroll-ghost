from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models.audit import AuditEvent
from app.models.employee import Employee
from app.models.investigation import Investigation
from app.models.payroll import FlaggedRow, PayrollCycle
from app.schemas.dashboard import DepartmentRisk, IntegrityOverview, ThreatFeedItem, TrendPoint

router = APIRouter(prefix="/api/v1", tags=["integrity"])


@router.get("/integrity/overview", response_model=IntegrityOverview)
async def get_overview(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    active_invs = await db.execute(
        select(func.count(Investigation.id)).where(Investigation.status != "closed")
    )
    active_count = active_invs.scalar() or 0

    paused = await db.execute(
        select(func.count(FlaggedRow.id)).where(FlaggedRow.payment_status == "paused")
    )
    paused_count = paused.scalar() or 0

    flagged = await db.execute(
        select(func.count(FlaggedRow.id)).where(FlaggedRow.severity.in_(["high", "medium"]))
    )
    flagged_count = flagged.scalar() or 0

    cycles = await db.execute(
        select(PayrollCycle).where(PayrollCycle.processing_status.in_(["ready", "locked"]))
    )
    ready_cycles = cycles.scalars().all()
    avg_integrity = (
        round(sum(c.integrity_score for c in ready_cycles) / len(ready_cycles))
        if ready_cycles
        else 100
    )

    return IntegrityOverview(
        payrollIntegrityScore=avg_integrity,
        flaggedDisbursements=flagged_count,
        activeInvestigations=active_count,
        pausedPayments=paused_count,
    )


@router.get("/threat-feed", response_model=list[ThreatFeedItem])
async def get_threat_feed(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(AuditEvent)
        .where(AuditEvent.type.in_(["anomaly", "intervention", "investigation"]))
        .order_by(AuditEvent.at.desc())
        .limit(20)
    )
    events = result.scalars().all()
    return [
        ThreatFeedItem(
            id=str(e.id),
            timestamp=e.at.isoformat(),
            title=e.title,
            severity="high" if e.type == "anomaly" else "medium",
            department=None,
        )
        for e in events
    ]


@router.get("/departments/risk", response_model=list[DepartmentRisk])
async def get_department_risk(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(
            Employee.department,
            func.count(FlaggedRow.id).label("anomaly_count"),
            func.avg(Employee.trust_score - func.coalesce(Employee.trust_previous, Employee.trust_score)).label("trust_delta"),
        )
        .join(FlaggedRow, FlaggedRow.employee_id == Employee.id)
        .where(Employee.department.isnot(None))
        .group_by(Employee.department)
        .order_by(func.count(FlaggedRow.id).desc())
    )
    rows = result.all()

    def risk_from_count(n: int) -> str:
        if n >= 4:
            return "high"
        if n >= 2:
            return "medium"
        return "low"

    return [
        DepartmentRisk(
            department=r.department,
            anomalyCount=r.anomaly_count,
            trustDelta=int(r.trust_delta or 0),
            riskLevel=risk_from_count(r.anomaly_count),
        )
        for r in rows
    ]


@router.get("/trends/integrity", response_model=list[TrendPoint])
async def get_trends(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    points = []
    for week in range(3, -1, -1):
        week_start = now - timedelta(weeks=week + 1)
        week_end = now - timedelta(weeks=week)
        label = f"W{4 - week}"

        anomaly_count_result = await db.execute(
            select(func.count(AuditEvent.id)).where(
                AuditEvent.type == "anomaly",
                AuditEvent.at >= week_start,
                AuditEvent.at < week_end,
            )
        )
        anomaly_count = anomaly_count_result.scalar() or 0

        cycles_result = await db.execute(
            select(PayrollCycle).where(
                PayrollCycle.uploaded_at >= week_start,
                PayrollCycle.uploaded_at < week_end,
                PayrollCycle.processing_status.in_(["ready", "locked"]),
            )
        )
        week_cycles = cycles_result.scalars().all()
        integrity = (
            round(sum(c.integrity_score for c in week_cycles) / len(week_cycles))
            if week_cycles
            else 100
        )
        points.append(TrendPoint(period=label, integrityScore=integrity, anomalyCount=anomaly_count))

    return points
