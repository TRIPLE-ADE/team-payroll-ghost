import hashlib
import hmac
import json

from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.audit import AuditEvent
from app.models.payment import PaymentAction
from app.models.payroll import FlaggedRow

router = APIRouter(prefix="/api/v1/webhooks", tags=["webhooks"])


@router.post("/squad")
async def receive_squad_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("x-squad-signature", "")

    if settings.SQUAD_SECRET_KEY:
        expected = hmac.new(settings.SQUAD_SECRET_KEY.encode(), body, hashlib.sha512).hexdigest()
        if not hmac.compare_digest(expected, sig):
            raise HTTPException(status_code=400, detail="Invalid webhook signature")

    try:
        payload = json.loads(body)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    tx_ref = payload.get("transaction_reference") or payload.get("body", {}).get("transaction_reference")
    tx_status = payload.get("transaction_status") or payload.get("body", {}).get("transaction_status", "")
    success = tx_status.lower() in ("success", "successful", "completed")

    async with AsyncSessionLocal() as db:
        if tx_ref:
            result = await db.execute(
                select(PaymentAction).where(PaymentAction.squad_ref == tx_ref)
            )
            pa = result.scalar_one_or_none()

            if pa:
                pa.squad_tx_status = "success" if success else "failed"

                if success:
                    # Update linked flagged row to disbursed
                    fr_result = await db.execute(
                        select(FlaggedRow).where(
                            FlaggedRow.employee_id == pa.employee_id,
                            FlaggedRow.cycle_id == pa.cycle_id,
                        )
                    )
                    fr = fr_result.scalar_one_or_none()
                    if fr:
                        fr.payment_status = "disbursed"
                        db.add(fr)
                else:
                    # Revert to paused if transfer failed
                    fr_result = await db.execute(
                        select(FlaggedRow).where(
                            FlaggedRow.employee_id == pa.employee_id,
                            FlaggedRow.cycle_id == pa.cycle_id,
                        )
                    )
                    fr = fr_result.scalar_one_or_none()
                    if fr and fr.payment_status == "approved":
                        fr.payment_status = "paused"
                        db.add(fr)

                pa.history = list(pa.history or []) + [{
                    "at": payload.get("created_at", ""),
                    "action": f"Squad webhook: {tx_status}",
                    "actor": "squad.webhook",
                }]
                db.add(pa)

            db.add(AuditEvent(
                type="intervention",
                title=f"Squad webhook received — {'success' if success else 'failed'}",
                detail=f"tx_ref={tx_ref}, status={tx_status}",
                actor="squad.webhook",
                ref_id=tx_ref,
            ))
            await db.commit()

    # Squad requires this exact response format
    return {
        "response_code": 200,
        "transaction_reference": tx_ref,
        "response_description": "Success",
    }
