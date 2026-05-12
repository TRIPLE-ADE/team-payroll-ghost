import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models.audit import AuditEvent
from app.schemas.squad import SquadLedgerEntry

router = APIRouter(prefix="/api/v1/squad", tags=["squad"])


@router.get("/ledger/recent", response_model=list[SquadLedgerEntry])
async def get_squad_ledger_recent(
    limit: int = Query(10, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Recent money-movement events (holds, releases, credits, debits)."""
    # Query audit events related to Squad payments and interventions
    result = await db.execute(
        select(AuditEvent)
        .where(AuditEvent.type.in_(["intervention", "anomaly"]))
        .order_by(AuditEvent.at.desc())
        .limit(limit)
    )
    events = result.scalars().all()

    # Map audit events to ledger entries
    ledger = []
    for event in events:
        # Determine direction based on event type
        if "success" in event.detail.lower():
            direction = "credit"
        elif "failed" in event.detail.lower() or "paused" in event.detail.lower():
            direction = "hold"
        else:
            direction = "debit"

        entry = SquadLedgerEntry(
            id=f"sl-{str(event.id)[:8]}",
            at=event.at,
            title=event.title or "Squad transaction",
            detail=event.detail or "",
            amount=0,  # Real implementation would fetch from Squad API
            direction=direction,
            squad_ref=event.ref_id,
            related_cycle_id=None,  # Could be populated from context
            related_employee_id=None,  # Could be populated from context
        )
        ledger.append(entry)

    return ledger
