from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models.employee import Employee
from app.models.payment import PaymentAction
from app.models.payroll import PayrollCycle
from app.schemas.payment import PaymentHistoryEntry, PaymentInterventionRow

router = APIRouter(prefix="/api/v1/payments", tags=["payments"])


@router.get("/interventions", response_model=list[PaymentInterventionRow])
async def get_interventions(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(PaymentAction).order_by(PaymentAction.updated_at.desc())
    )
    actions = result.scalars().all()

    out = []
    for pa in actions:
        emp = await db.get(Employee, pa.employee_id)
        cycle = await db.get(PayrollCycle, pa.cycle_id)
        if not emp or not cycle:
            continue

        history = [
            PaymentHistoryEntry(at=h["at"], action=h["action"], actor=h.get("actor"))
            for h in (pa.history or [])
        ]

        out.append(
            PaymentInterventionRow(
                id=str(pa.id),
                employeeId=emp.emp_id,
                employeeName=emp.name,
                cycleId=str(pa.cycle_id),
                cycleLabel=cycle.label,
                state=pa.state,
                netAmount=float(pa.net_amount or 0),
                updatedAt=pa.updated_at.isoformat(),
                squadRef=pa.squad_ref,
                history=history,
            )
        )

    return out
