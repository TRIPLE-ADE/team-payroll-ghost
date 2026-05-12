from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models.payroll import FlaggedRow, PaymentAction, PayrollCycle
from app.models.investigation import Investigation
from app.schemas.operations import LiquidityStats, QueueStats

router = APIRouter(prefix="/api/v1/operations", tags=["operations"])


@router.get("/liquidity", response_model=LiquidityStats)
async def get_liquidity_stats(db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    """Integrity holds vs scheduled run — links risk actions to treasury."""
    # Sum paused payments from flagged rows in active cycles
    paused_result = await db.execute(
        select(func.coalesce(func.sum(FlaggedRow.final_score), 0))
        .select_from(FlaggedRow)
        .join(PaymentAction, PaymentAction.employee_id == FlaggedRow.employee_id)
        .where(FlaggedRow.payment_status == "paused")
    )
    # Approximate paused amount based on scoring (using final_score as proxy)
    paused_amount = int(paused_result.scalar() or 0)

    # Get total disbursement from current operational cycle (ready or analyzing)
    cycle_result = await db.execute(
        select(PayrollCycle.total_disbursement)
        .where(PayrollCycle.processing_status.in_(["ready", "analyzing"]))
        .order_by(PayrollCycle.uploaded_at.desc())
        .limit(1)
    )
    cycle = cycle_result.scalar_one_or_none()
    scheduled_total = int(cycle.total_disbursement) if cycle else 0

    # Count held payments (paused status)
    held_count_result = await db.execute(
        select(func.count(FlaggedRow.id)).where(FlaggedRow.payment_status == "paused")
    )
    held_count = held_count_result.scalar() or 0

    return LiquidityStats(
        paused_payments_total_amount=paused_amount,
        scheduled_payroll_total_amount=scheduled_total,
        held_count=held_count,
        as_of=datetime.now(timezone.utc),
    )


@router.get("/queue-stats", response_model=QueueStats)
async def get_queue_stats(db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    """Review queue / SLA indicators for the dashboard."""
    # Count open flagged rows
    flags_result = await db.execute(
        select(func.count(FlaggedRow.id))
        .where(FlaggedRow.investigation_status.in_(["open", "in_review"]))
    )
    open_flags = flags_result.scalar() or 0

    # Count open investigations
    inv_result = await db.execute(
        select(func.count(Investigation.id))
        .where(Investigation.status.in_(["open", "in_review"]))
    )
    open_investigations = inv_result.scalar() or 0

    # Oldest open investigation age in hours
    oldest_result = await db.execute(
        select(Investigation.opened_at)
        .where(Investigation.status.in_(["open", "in_review"]))
        .order_by(Investigation.opened_at.asc())
        .limit(1)
    )
    oldest_inv = oldest_result.scalar_one_or_none()
    if oldest_inv:
        age_hours = (datetime.now(timezone.utc) - oldest_inv).total_seconds() / 3600
    else:
        age_hours = 0.0

    # Sum paused amounts (approximate using final_score)
    paused_sum_result = await db.execute(
        select(func.coalesce(func.sum(FlaggedRow.final_score), 0))
        .where(FlaggedRow.payment_status == "paused")
    )
    paused_on_hold = int(paused_sum_result.scalar() or 0)

    return QueueStats(
        open_flags_count=open_flags,
        open_investigations_count=open_investigations,
        oldest_open_investigation_age_hours=age_hours,
        paused_amount_on_hold=paused_on_hold,
    )
