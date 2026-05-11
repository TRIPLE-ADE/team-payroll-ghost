from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models.employee import Employee
from app.models.payroll import PayrollHistory
from app.schemas.employee import EmployeeDirectoryEntry, PayrollHistoryMonth

router = APIRouter(prefix="/api/v1/employees", tags=["employees"])


def _risk_from_trust(score: int) -> str:
    if score < 55:
        return "high"
    if score < 75:
        return "medium"
    return "low"


@router.get("/directory", response_model=list[EmployeeDirectoryEntry])
async def get_directory(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    emps_result = await db.execute(select(Employee).order_by(Employee.trust_score.asc()))
    emps = emps_result.scalars().all()

    out = []
    for emp in emps:
        history_result = await db.execute(
            select(PayrollHistory)
            .where(PayrollHistory.employee_id == emp.id)
            .order_by(PayrollHistory.created_at.asc())
            .limit(6)
        )
        history = history_result.scalars().all()

        last_pay = history[-1].net_amount if history else None
        history_months = [
            PayrollHistoryMonth(month=h.month_label or "—", amount=float(h.net_amount or 0))
            for h in history
        ]

        out.append(
            EmployeeDirectoryEntry(
                id=emp.emp_id,
                name=emp.name,
                role=emp.role,
                department=emp.department,
                verificationExpiresAt=emp.verification_expires_at.isoformat() if emp.verification_expires_at else None,
                verificationStatus=emp.verification_status,
                trustScore=emp.trust_score,
                peerGroupAvgTrust=75,  # computed per-request below if needed
                payrollHistoryMonths=history_months,
                riskLevel=_risk_from_trust(emp.trust_score),
                lastNetPay=float(last_pay) if last_pay else None,
            )
        )

    return out
