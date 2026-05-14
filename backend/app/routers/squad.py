import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.schemas.squad import SquadLedgerEntry
from app.services.squad_client import squad_client

router = APIRouter(prefix="/api/v1/squad", tags=["squad"])


@router.get("/ledger/recent", response_model=list[SquadLedgerEntry])
async def get_squad_ledger_recent(
    limit: int = Query(10, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Recent money-movement events (holds, releases, credits, debits)."""
    try:
        transfer_resp = await squad_client.list_transfers(page=1, per_page=limit, direction="DESC")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Unable to fetch Squad transfer history: {exc}")

    if not (transfer_resp.get("success") is True or transfer_resp.get("status") == 200):
        raise HTTPException(status_code=502, detail=transfer_resp.get("message", "Squad transfer history request failed"))

    transfer_rows = transfer_resp.get("data") or []
    ledger = []
    for row in transfer_rows:
        raw_status = row.get("transaction_status")
        status = squad_client.normalize_transfer_status(raw_status)
        if status == "success":
            direction = "debit"
        elif status == "pending":
            direction = "hold"
        else:
            direction = "hold"

        timestamp = row.get("created_at") or row.get("updated_at")
        try:
            at = datetime.fromisoformat(timestamp.replace("Z", "+00:00")) if timestamp else datetime.now(timezone.utc)
        except Exception:
            at = datetime.now(timezone.utc)

        amount_kobo = int(row.get("amount_debited") or row.get("amount") or 0)
        recipient = row.get("recipient") or row.get("account_name") or "Unknown recipient"
        tx_ref = row.get("transaction_reference")

        ledger.append(SquadLedgerEntry(
            id=f"sl-{(tx_ref or uuid.uuid4().hex)[:8]}",
            at=at,
            title="Squad payout transfer",
            detail=f"{recipient} - {raw_status or 'unknown'}",
            amount=amount_kobo // 100,
            direction=direction,
            squad_ref=tx_ref,
            related_cycle_id=None,
            related_employee_id=None,
        ))

    return ledger
