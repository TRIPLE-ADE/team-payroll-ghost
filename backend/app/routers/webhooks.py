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
    """
    Handle Squad webhook with signature verification.
    Supports both V1 (full body hash) and V2/V3 (field-specific hash).
    """
    body = await request.body()
    sig = request.headers.get("x-squad-signature", "")

    try:
        payload = json.loads(body)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    # Signature verification with fallback to V2/V3 if V1 fails
    if settings.SQUAD_SECRET_KEY:
        # Try V1: hash entire request body
        v1_expected = hmac.new(settings.SQUAD_SECRET_KEY.encode(), body, hashlib.sha512).hexdigest()
        v1_valid = hmac.compare_digest(v1_expected, sig)

        if not v1_valid:
            # Try V2/V3: hash pipe-separated specific fields
            fields = [
                str(payload.get("transaction_reference", "")),
                str(payload.get("virtual_account_number", "")),
                str(payload.get("currency", "NGN")),
                str(payload.get("principal_amount", "")),
                str(payload.get("settled_amount", "")),
                str(payload.get("customer_identifier", "")),
            ]
            fields_str = "|".join(fields)
            v2_expected = hmac.new(settings.SQUAD_SECRET_KEY.encode(), fields_str.encode(), hashlib.sha512).hexdigest()
            v2_valid = hmac.compare_digest(v2_expected, sig)

            if not v2_valid:
                raise HTTPException(status_code=400, detail="Invalid webhook signature")

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
                # Webhook idempotency: check if already processed this tx_ref with same status
                previous_status = pa.squad_tx_status
                new_status = "success" if success else "failed"

                # Only update if status actually changed (idempotency)
                if previous_status != new_status:
                    pa.squad_tx_status = new_status

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

                    # Append to history only on status change
                    pa.history = list(pa.history or []) + [{
                        "at": payload.get("created_at", ""),
                        "action": f"Squad webhook: {tx_status}",
                        "actor": "squad.webhook",
                    }]
                    db.add(pa)

                db.add(AuditEvent(
                    type="intervention",
                    title=f"Squad webhook — {'success' if success else 'failed'}",
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
