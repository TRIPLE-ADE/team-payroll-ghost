import csv
import io
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db, AsyncSessionLocal
from app.models.audit import AuditEvent
from app.models.employee import Employee
from app.models.payroll import FlaggedRow, PayrollCycle, PayrollHistory
from app.schemas.payroll import AnalyzeResponse, PayrollCycleDetail, PayrollCycleSummary, UploadResponse, FlaggedQueueRow
from app.services.analysis import run_analysis

router = APIRouter(prefix="/api/v1/payroll", tags=["payroll"])

REQUIRED_COLS = {"emp_id", "salary", "grade_level", "tenure_months"}


# ── Serializers ──────────────────────────────────────────────────────────────

def _cycle_summary(c: PayrollCycle) -> PayrollCycleSummary:
    return PayrollCycleSummary(
        id=str(c.id),
        label=c.label,
        uploadedAt=c.uploaded_at.isoformat(),
        totalEmployees=c.total_employees,
        totalDisbursement=float(c.total_disbursement),
        flaggedCount=c.flagged_count,
        pausedPayments=c.paused_payments,
        integrityScore=c.integrity_score,
        processingStatus=c.processing_status,
        sourceFile=c.source_file,
    )


async def _build_flagged_rows(db: AsyncSession, cycle_id: uuid.UUID) -> list[FlaggedQueueRow]:
    result = await db.execute(
        select(FlaggedRow).where(FlaggedRow.cycle_id == cycle_id).order_by(FlaggedRow.created_at.desc())
    )
    rows = result.scalars().all()
    out = []
    for row in rows:
        emp = await db.get(Employee, row.employee_id)
        if not emp:
            continue
        out.append(FlaggedQueueRow(
            employeeId=emp.emp_id,
            employeeName=emp.name,
            trustScore=row.trust_score or emp.trust_score,
            trustPrevious=row.trust_previous,
            anomalyLabels=row.anomaly_labels or [],
            attendanceNotes=row.attendance_notes or [],
            paymentStatus=row.payment_status,
            investigationStatus=row.investigation_status,
            investigationId=str(row.investigation_id) if row.investigation_id else None,
            relationshipWarning=row.relationship_warning,
            severity=row.severity or "low",
        ))
    return out


# ── Routes ───────────────────────────────────────────────────────────────────

@router.get("/cycles", response_model=list[PayrollCycleSummary])
async def list_cycles(
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    q = select(PayrollCycle).order_by(PayrollCycle.uploaded_at.desc())
    if status:
        q = q.where(PayrollCycle.processing_status == status)
    result = await db.execute(q)
    return [_cycle_summary(c) for c in result.scalars().all()]


@router.get("/cycles/current", response_model=PayrollCycleSummary | None)
async def get_current_cycle(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """Current operational payroll run (newest cycle in ready/analyzing status)."""
    result = await db.execute(
        select(PayrollCycle)
        .where(PayrollCycle.processing_status.in_(["ready", "analyzing"]))
        .order_by(PayrollCycle.uploaded_at.desc())
        .limit(1)
    )
    cycle = result.scalar_one_or_none()
    return _cycle_summary(cycle) if cycle else None


@router.get("/cycles/{cycle_id}", response_model=PayrollCycleDetail)
async def get_cycle(
    cycle_id: str,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    c = await db.get(PayrollCycle, uuid.UUID(cycle_id))
    if not c:
        raise HTTPException(status_code=404, detail="Cycle not found")
    flagged = await _build_flagged_rows(db, c.id)
    return PayrollCycleDetail(**_cycle_summary(c).model_dump(), flaggedRows=flagged)


@router.post("/cycles", response_model=UploadResponse)
async def upload_cycle(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    content = await file.read()
    try:
        reader = csv.DictReader(io.StringIO(content.decode("utf-8")))
        rows = list(reader)
    except Exception:
        raise HTTPException(status_code=400, detail="Cannot parse CSV file")

    if not rows:
        raise HTTPException(status_code=400, detail="CSV file is empty")

    cols = set(rows[0].keys())
    missing = REQUIRED_COLS - cols
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing CSV columns: {missing}")

    # Create cycle
    now = datetime.now(timezone.utc)
    month_label = now.strftime("%b %Y")
    cycle = PayrollCycle(
        label=f"{month_label} — Upload",
        source_file=file.filename,
        processing_status="uploaded",
        total_employees=len(rows),
        total_disbursement=sum(float(r.get("salary", 0)) for r in rows),
    )
    db.add(cycle)
    await db.flush()

    # Upsert employees + payroll history
    for row in rows:
        emp_id = row.get("emp_id", "").strip()
        if not emp_id:
            continue

        emp_result = await db.execute(select(Employee).where(Employee.emp_id == emp_id))
        emp = emp_result.scalar_one_or_none()

        if emp:
            # Update mutable fields
            emp.salary = float(row.get("salary", emp.salary or 0))
            emp.grade_level = row.get("grade_level", emp.grade_level)
            emp.tenure_months = int(row.get("tenure_months", emp.tenure_months or 0))
            emp.avg_attendance_days = float(row.get("avg_attendance_days", emp.avg_attendance_days or 20))
            emp.months_no_deduction = int(row.get("months_no_deduction", emp.months_no_deduction or 0))
            emp.leave_days_taken = int(row.get("leave_days_taken", emp.leave_days_taken or 0))
            emp.promotion_count = int(row.get("promotion_count", emp.promotion_count or 0))
        else:
            emp = Employee(
                emp_id=emp_id,
                name=row.get("name") or row.get("full_name") or emp_id,
                role=row.get("role"),
                department=row.get("department") or row.get("mda"),
                grade_level=row.get("grade_level"),
                mda=row.get("mda"),
                bvn=row.get("bvn"),
                nin=row.get("nin"),
                account_number=row.get("account_number"),
                bank_code=row.get("bank_code"),
                bank_name=row.get("bank") or row.get("bank_name"),
                dob=row.get("dob") or row.get("date_of_birth"),
                gender=row.get("gender"),
                phone=row.get("phone") or row.get("phone_number"),
                salary=float(row.get("salary", 0)),
                hire_date=row.get("hire_date"),
                tenure_months=int(row.get("tenure_months", 0)),
                avg_attendance_days=float(row.get("avg_attendance_days", 20)),
                months_no_deduction=int(row.get("months_no_deduction", 0)),
                leave_days_taken=int(row.get("leave_days_taken", 0)),
                promotion_count=int(row.get("promotion_count", 0)),
            )
            db.add(emp)

        await db.flush()

        db.add(PayrollHistory(
            employee_id=emp.id,
            cycle_id=cycle.id,
            month_label=month_label,
            net_amount=float(row.get("salary", 0)),
        ))

    # Audit log
    db.add(AuditEvent(
        type="payroll_upload",
        title="Payroll batch staged",
        detail=f"{file.filename} — {len(rows)} employees",
        actor="operator.upload",
        ref_id=str(cycle.id),
    ))

    await db.commit()
    return UploadResponse(id=str(cycle.id))


@router.post("/cycles/{cycle_id}/analyze", response_model=AnalyzeResponse)
async def analyze_cycle(
    cycle_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    c = await db.get(PayrollCycle, uuid.UUID(cycle_id))
    if not c:
        raise HTTPException(status_code=404, detail="Cycle not found")
    if c.processing_status != "uploaded":
        raise HTTPException(
            status_code=400,
            detail=f"Analysis can only start from 'uploaded' status (current: {c.processing_status})",
        )

    c.processing_status = "analyzing"
    db.add(c)
    await db.commit()

    # Run analysis in background with its own DB session
    async def _task():
        async with AsyncSessionLocal() as session:
            await run_analysis(cycle_id, session)

    background_tasks.add_task(_task)
    return AnalyzeResponse(ok=True, message="Analysis started")
