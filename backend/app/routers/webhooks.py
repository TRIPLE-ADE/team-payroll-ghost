import hashlib
import hmac
import json
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import select

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.audit import AuditEvent
from app.models.payment import PaymentAction
from app.models.payroll import FlaggedRow
from app.models.topup import TreasuryTopUp
from app.services.squad_client import squad_client

router = APIRouter(prefix="/api/v1/webhooks", tags=["webhooks"])


def _hash_hex(secret: str, payload: bytes) -> str:
    return hmac.new(secret.encode(), payload, hashlib.sha512).hexdigest()


def _signature_matches(expected: str, provided: str) -> bool:
    return hmac.compare_digest(expected.lower(), (provided or "").lower())


def _extract_body(payload: dict) -> dict:
    body = payload.get("body")
    if isinstance(body, dict):
        return body
    body = payload.get("Body")
    if isinstance(body, dict):
        return body
    return {}


def _extract_tx_ref(payload: dict) -> str | None:
    body = _extract_body(payload)
    return (
        payload.get("transaction_reference")
        or payload.get("transaction_ref")
        or payload.get("TransactionRef")
        or body.get("transaction_reference")
        or body.get("transaction_ref")
    )


def _extract_tx_status(payload: dict) -> str:
    body = _extract_body(payload)
    return (
        payload.get("transaction_status")
        or body.get("transaction_status")
        or body.get("status")
        or ""
    )


def _extract_created_at(payload: dict) -> str:
    body = _extract_body(payload)
    return payload.get("created_at") or body.get("created_at") or datetime.now(timezone.utc).isoformat()


def _apply_topup_webhook(topup: TreasuryTopUp, payload: dict) -> str:
    body = _extract_body(payload)
    tx_status = _extract_tx_status(payload)
    normalized = squad_client.normalize_collection_status(tx_status)
    if normalized != "unknown":
        topup.status = normalized
    topup.customer_email = body.get("email") or payload.get("email") or topup.customer_email
    topup.squad_transaction_type = body.get("transaction_type") or payload.get("transaction_type") or topup.squad_transaction_type
    topup.squad_gateway_ref = body.get("gateway_ref") or payload.get("gateway_ref") or topup.squad_gateway_ref
    topup.squad_merchant_id = body.get("merchant_id") or payload.get("merchant_id") or topup.squad_merchant_id
    if body.get("merchant_amount") or body.get("amount") or payload.get("amount"):
        topup.settled_amount_kobo = int(body.get("merchant_amount") or body.get("amount") or payload.get("amount") or 0)
    created_at = _extract_created_at(payload)
    try:
        completed_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
    except Exception:
        completed_at = None
    if completed_at and topup.status in {"success", "failed", "abandoned"}:
        topup.completed_at = completed_at
    topup.webhook_payload = payload
    return topup.status


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

    # Signature verification with fallback across Squad webhook versions.
    raw_header = request.headers.get("x-squad-encrypted-body", "")
    if settings.SQUAD_SECRET_KEY and (sig or raw_header):
        v1_expected = _hash_hex(settings.SQUAD_SECRET_KEY, body)
        v1_valid = _signature_matches(v1_expected, sig) or _signature_matches(v1_expected, raw_header)

        if not v1_valid and sig:
            fields = [
                str(payload.get("transaction_reference", "")),
                str(payload.get("virtual_account_number", "")),
                str(payload.get("currency", "NGN")),
                str(payload.get("principal_amount", "")),
                str(payload.get("settled_amount", "")),
                str(payload.get("customer_identifier", "")),
            ]
            fields_str = "|".join(fields)
            v2_expected = _hash_hex(settings.SQUAD_SECRET_KEY, fields_str.encode())
            v2_valid = _signature_matches(v2_expected, sig)

            if not v2_valid:
                raise HTTPException(status_code=400, detail="Invalid webhook signature")
        elif not v1_valid:
            raise HTTPException(status_code=400, detail="Invalid webhook signature")

    tx_ref = _extract_tx_ref(payload)
    tx_status = _extract_tx_status(payload)
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
                    pa.updated_at = datetime.now(timezone.utc)

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
                        pa.state = "released"
                    else:
                        # Revert to paused if transfer failed
                        fr_result = await db.execute(
                            select(FlaggedRow).where(
                                FlaggedRow.employee_id == pa.employee_id,
                                FlaggedRow.cycle_id == pa.cycle_id,
                            )
                        )
                        fr = fr_result.scalar_one_or_none()
                        if fr and fr.payment_status in {"approved", "disbursed"}:
                            fr.payment_status = "paused"
                            db.add(fr)
                        pa.state = "paused"

                    # Append to history only on status change
                    pa.history = list(pa.history or []) + [{
                        "at": _extract_created_at(payload),
                        "action": f"Squad webhook: {tx_status}",
                        "actor": "squad.webhook",
                    }]
                    db.add(pa)

                body_payload = _extract_body(payload)
                db.add(AuditEvent(
                    type="intervention",
                    title=f"Squad webhook — {'success' if success else 'failed'}",
                    detail=(
                        f"tx_ref={tx_ref}, status={tx_status}, "
                        f"type={body_payload.get('transaction_type') or payload.get('transaction_type') or 'unknown'}"
                    ),
                    actor="squad.webhook",
                    ref_id=tx_ref,
                ))
                await db.commit()
            else:
                topup_result = await db.execute(
                    select(TreasuryTopUp).where(TreasuryTopUp.transaction_ref == tx_ref)
                )
                topup = topup_result.scalar_one_or_none()

                if topup:
                    previous_status = topup.status
                    new_status = _apply_topup_webhook(topup, payload)
                    topup.updated_at = datetime.now(timezone.utc)
                    db.add(topup)

                    if previous_status != new_status:
                        db.add(AuditEvent(
                            type="treasury",
                            title=f"Treasury top-up {new_status}",
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
