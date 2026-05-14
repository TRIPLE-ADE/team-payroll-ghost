from datetime import datetime, timezone
from html import escape
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import HTMLResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.models.audit import AuditEvent
from app.models.topup import TreasuryTopUp
from app.schemas.topup import (
    TreasuryTopUpInitiateRequest,
    TreasuryTopUpResponse,
    TreasuryTopUpSimulationRequest,
    TreasuryTopUpSimulationResponse,
)
from app.schemas.treasury import TreasuryWallet
from app.services.squad_client import squad_client

router = APIRouter(prefix="/api/v1/treasury", tags=["treasury"])


def _bank_name_from_code(bank_code: str | None) -> str | None:
    if bank_code == "058":
        return "GTBank"
    return None


def _display_name_from_email(email: str) -> str:
    local = email.split("@", 1)[0].replace(".", " ").replace("_", " ").strip()
    return local.title() or "GhostGuard Operator"


def _external_base_url(request: Request) -> str:
    proto = request.headers.get("x-forwarded-proto") or request.url.scheme
    host = request.headers.get("x-forwarded-host") or request.headers.get("host") or request.url.netloc
    return f"{proto}://{host}".rstrip("/")


def _default_topup_callback_url(request: Request, topup_id: UUID) -> str:
    return f"{_external_base_url(request)}/api/v1/treasury/topups/{topup_id}/redirect"


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except Exception:
        return None


def _topup_response(topup: TreasuryTopUp) -> TreasuryTopUpResponse:
    return TreasuryTopUpResponse(
        id=str(topup.id),
        status=topup.status,
        amount=topup.amount_kobo // 100,
        currency=topup.currency,
        transaction_ref=topup.transaction_ref,
        checkout_url=topup.checkout_url,
        callback_url=topup.callback_url,
        customer_email=topup.customer_email,
        customer_name=topup.customer_name,
        payment_channels=list(topup.payment_channels or []),
        pass_charge=topup.pass_charge,
        virtual_account_number=topup.virtual_account_number,
        squad_transaction_type=topup.squad_transaction_type,
        squad_gateway_ref=topup.squad_gateway_ref,
        squad_merchant_id=topup.squad_merchant_id,
        metadata=topup.metadata_json,
        created_at=topup.created_at,
        updated_at=topup.updated_at,
        completed_at=topup.completed_at,
    )


async def _get_topup_or_404(db: AsyncSession, topup_id: UUID) -> TreasuryTopUp:
    result = await db.execute(select(TreasuryTopUp).where(TreasuryTopUp.id == topup_id))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Treasury top-up not found")
    return row


def _apply_topup_from_verify(topup: TreasuryTopUp, verify_resp: dict) -> str:
    data = verify_resp.get("data") or {}
    status = squad_client.normalize_collection_status(data.get("transaction_status"))
    if status != "unknown":
        topup.status = status
    topup.currency = data.get("transaction_currency_id") or topup.currency
    topup.customer_email = data.get("email") or topup.customer_email
    topup.squad_transaction_type = data.get("transaction_type") or topup.squad_transaction_type
    topup.squad_gateway_ref = data.get("gateway_ref") or data.get("gateway_transaction_ref") or topup.squad_gateway_ref
    topup.squad_merchant_id = data.get("merchant_id") or topup.squad_merchant_id
    if data.get("transaction_amount"):
        topup.settled_amount_kobo = int(data.get("transaction_amount") or 0)
    completed_at = _parse_dt(data.get("created_at")) or _parse_dt(data.get("updated_at"))
    if completed_at and topup.status in {"success", "failed", "abandoned"}:
        topup.completed_at = completed_at
    topup.verify_payload = verify_resp
    return topup.status


def _apply_topup_from_webhook(topup: TreasuryTopUp, payload: dict) -> str:
    body = payload.get("body")
    if not isinstance(body, dict):
        body = payload.get("Body")
    if not isinstance(body, dict):
        body = {}

    tx_status = (
        payload.get("transaction_status")
        or body.get("transaction_status")
        or body.get("status")
    )
    status = squad_client.normalize_collection_status(tx_status)
    if status != "unknown":
        topup.status = status
    topup.customer_email = body.get("email") or payload.get("email") or topup.customer_email
    topup.squad_transaction_type = body.get("transaction_type") or payload.get("transaction_type") or topup.squad_transaction_type
    topup.squad_gateway_ref = body.get("gateway_ref") or payload.get("gateway_ref") or topup.squad_gateway_ref
    topup.squad_merchant_id = body.get("merchant_id") or payload.get("merchant_id") or topup.squad_merchant_id
    if body.get("merchant_amount") or body.get("amount") or payload.get("amount"):
        topup.settled_amount_kobo = int(body.get("merchant_amount") or body.get("amount") or payload.get("amount") or 0)
    completed_at = _parse_dt(body.get("created_at")) or _parse_dt(payload.get("created_at"))
    if completed_at and topup.status in {"success", "failed", "abandoned"}:
        topup.completed_at = completed_at
    topup.webhook_payload = payload
    return topup.status


def _render_topup_redirect_page(topup: TreasuryTopUp, verify_error: str | None = None) -> str:
    status_label = escape(topup.status.replace("_", " ").title())
    tx_ref = escape(topup.transaction_ref)
    amount = f"NGN {topup.amount_kobo // 100:,}"
    lines = [
        "<!doctype html>",
        "<html><head><meta charset='utf-8'><title>GhostGuard Treasury Funding</title>",
        "<meta name='viewport' content='width=device-width, initial-scale=1'>",
        "<style>",
        "body{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:#0a0a0a;color:#f4f4f5;padding:32px;}",
        ".card{max-width:720px;margin:0 auto;border:1px solid #27272a;background:#111827;padding:24px;border-radius:16px;}",
        ".muted{color:#a1a1aa;font-size:12px}.status{font-size:28px;font-weight:700;margin:8px 0 16px}",
        "a{color:#93c5fd} code{background:#18181b;padding:2px 6px;border-radius:6px}",
        "</style></head><body><div class='card'>",
        "<div class='muted'>GhostGuard treasury funding callback</div>",
        f"<div class='status'>{status_label}</div>",
        f"<p>Top-up request for <strong>{amount}</strong> is now <strong>{status_label.lower()}</strong>.</p>",
        f"<p class='muted'>Transaction reference: <code>{tx_ref}</code></p>",
    ]
    if topup.checkout_url:
        lines.append(f"<p class='muted'>Checkout URL: <a href='{escape(topup.checkout_url)}'>{escape(topup.checkout_url)}</a></p>")
    if verify_error:
        lines.append(f"<p class='muted'>Verification refresh failed: {escape(verify_error)}</p>")
    lines.append("</div></body></html>")
    return "".join(lines)


@router.get("/wallet", response_model=TreasuryWallet)
async def get_treasury_wallet(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Squad-linked payroll float: balance and virtual account."""
    try:
        balance_resp = await squad_client.get_wallet_balance()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Unable to fetch Squad wallet balance: {exc}")

    if not (balance_resp.get("success") is True or balance_resp.get("status") == 200):
        raise HTTPException(status_code=502, detail=balance_resp.get("message", "Squad wallet balance request failed"))

    balance_data = balance_resp.get("data") or {}
    balance_kobo = int(balance_data.get("balance") or 0)
    balance_amount = balance_kobo // 100
    merchant_ref = balance_data.get("merchant_id")

    pending_result = await db.execute(
        select(func.coalesce(func.sum(TreasuryTopUp.amount_kobo), 0)).where(
            TreasuryTopUp.status.in_(("initiated", "pending"))
        )
    )
    pending_amount = int(pending_result.scalar_one() or 0) // 100

    virtual_account_number = None
    bank_name = None
    account_name = None

    try:
        merchant_accounts_resp = await squad_client.get_merchant_virtual_accounts(page=1, per_page=10)
        merchant_accounts = merchant_accounts_resp.get("data") or []
        if isinstance(merchant_accounts, list) and merchant_accounts:
            account = merchant_accounts[0]
            virtual_account_number = account.get("virtual_account_number")
            bank_name = _bank_name_from_code(account.get("bank_code"))
            customer = account.get("customer") or {}
            first_name = account.get("first_name") or customer.get("first_name")
            last_name = account.get("last_name") or customer.get("last_name")
            if first_name or last_name:
                account_name = " ".join(part for part in [first_name, last_name] if part)
    except Exception:
        # Absence of merchant virtual accounts should not block live balance display.
        pass

    return TreasuryWallet(
        balance_amount=balance_amount,
        available_amount=balance_amount,
        pending_settlement_amount=pending_amount,
        virtual_account_number=virtual_account_number,
        bank_name=bank_name,
        account_name=account_name,
        last_synced_at=datetime.now(timezone.utc),
        squad_merchant_ref=merchant_ref,
    )


@router.get("/topups", response_model=list[TreasuryTopUpResponse])
async def list_treasury_topups(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(
        select(TreasuryTopUp).order_by(TreasuryTopUp.created_at.desc()).limit(limit)
    )
    rows = result.scalars().all()
    return [_topup_response(row) for row in rows]


@router.post("/topups/initiate", response_model=TreasuryTopUpResponse, status_code=status.HTTP_201_CREATED)
async def initiate_treasury_topup(
    body: TreasuryTopUpInitiateRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    customer_email = (body.email or user["email"]).strip()
    if not customer_email:
        raise HTTPException(status_code=400, detail="Customer email is required")

    customer_name = (body.customer_name or _display_name_from_email(customer_email)).strip()
    payment_channels = [channel.strip().lower() for channel in (body.payment_channels or ["transfer"]) if channel.strip()]
    metadata = dict(body.metadata or {})
    topup = TreasuryTopUp(
        initiated_by=user["email"],
        customer_email=customer_email,
        customer_name=customer_name,
        amount_kobo=body.amount * 100,
        currency="NGN",
        status="initiated",
        transaction_ref=squad_client.build_collection_ref(),
        payment_channels=payment_channels,
        pass_charge=body.pass_charge,
        metadata_json=metadata,
    )
    db.add(topup)
    await db.flush()

    metadata.setdefault("ghostguard_topup_id", str(topup.id))
    metadata.setdefault("ghostguard_purpose", "payroll_float_topup")
    metadata.setdefault("initiated_by", user["email"])
    topup.metadata_json = metadata
    topup.callback_url = (body.callback_url or _default_topup_callback_url(request, topup.id)).strip()

    try:
        initiate_resp = await squad_client.initiate_payment(
            email=customer_email,
            amount_kobo=topup.amount_kobo,
            tx_ref=topup.transaction_ref,
            callback_url=topup.callback_url,
            customer_name=customer_name,
            payment_channels=payment_channels,
            pass_charge=body.pass_charge,
            metadata=metadata,
            currency=topup.currency,
        )
    except Exception as exc:
        topup.status = "failed"
        topup.checkout_payload = {"error": str(exc)}
        db.add(topup)
        await db.commit()
        raise HTTPException(status_code=502, detail=f"Unable to initiate Squad funding checkout: {exc}")

    topup.checkout_payload = initiate_resp
    if not (initiate_resp.get("success") is True or initiate_resp.get("status") == 200):
        topup.status = "failed"
        db.add(topup)
        await db.commit()
        raise HTTPException(status_code=502, detail=initiate_resp.get("message", "Squad checkout initiation failed"))

    data = initiate_resp.get("data") or {}
    topup.status = "pending"
    topup.checkout_url = data.get("checkout_url") or data.get("link")
    topup.callback_url = data.get("callback_url") or topup.callback_url
    topup.squad_merchant_id = data.get("merchant_id") or topup.squad_merchant_id

    db.add(topup)
    db.add(AuditEvent(
        type="treasury",
        title="Treasury top-up initiated",
        detail=f"{body.amount:,} NGN checkout created for {customer_email}; tx_ref={topup.transaction_ref}",
        actor=user["email"],
        ref_id=topup.transaction_ref,
    ))
    await db.commit()
    await db.refresh(topup)
    return _topup_response(topup)


@router.get("/topups/{topup_id}", response_model=TreasuryTopUpResponse)
async def get_treasury_topup(
    topup_id: UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    topup = await _get_topup_or_404(db, topup_id)
    return _topup_response(topup)


@router.post("/topups/{topup_id}/verify", response_model=TreasuryTopUpResponse)
async def verify_treasury_topup(
    topup_id: UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    topup = await _get_topup_or_404(db, topup_id)
    previous_status = topup.status

    try:
        verify_resp = await squad_client.verify_transaction(topup.transaction_ref)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Unable to verify Squad transaction: {exc}")

    topup.verify_payload = verify_resp
    if not (verify_resp.get("success") is True or verify_resp.get("status") == 200):
        db.add(topup)
        await db.commit()
        raise HTTPException(status_code=502, detail=verify_resp.get("message", "Squad transaction verification failed"))

    current_status = _apply_topup_from_verify(topup, verify_resp)
    db.add(topup)
    if current_status != previous_status:
        db.add(AuditEvent(
            type="treasury",
            title=f"Treasury top-up {current_status}",
            detail=f"tx_ref={topup.transaction_ref}",
            actor=user["email"],
            ref_id=topup.transaction_ref,
        ))
    await db.commit()
    await db.refresh(topup)
    return _topup_response(topup)


@router.post("/topups/{topup_id}/simulate-transfer", response_model=TreasuryTopUpSimulationResponse)
async def simulate_treasury_topup_transfer(
    topup_id: UUID,
    body: TreasuryTopUpSimulationRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if "sandbox" not in settings.SQUAD_BASE_URL:
        raise HTTPException(status_code=400, detail="Transfer simulation is only available against Squad sandbox")

    topup = await _get_topup_or_404(db, topup_id)
    topup.virtual_account_number = body.virtual_account_number.strip()
    amount_naira = body.amount or (topup.amount_kobo // 100)
    amount_kobo = amount_naira * 100

    try:
        simulation_resp = await squad_client.simulate_virtual_account_payment(
            virtual_account_number=topup.virtual_account_number,
            amount_kobo=amount_kobo,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Unable to simulate Squad transfer payment: {exc}")

    verification_resp = None
    if simulation_resp.get("success") is True or simulation_resp.get("status") == 200:
        try:
            verification_resp = await squad_client.verify_transaction(topup.transaction_ref)
            if verification_resp.get("success") is True or verification_resp.get("status") == 200:
                _apply_topup_from_verify(topup, verification_resp)
        except Exception:
            verification_resp = None

    db.add(topup)
    db.add(AuditEvent(
        type="treasury",
        title="Treasury top-up simulated",
        detail=(
            f"{amount_naira:,} NGN simulated into {topup.virtual_account_number}; "
            f"tx_ref={topup.transaction_ref}"
        ),
        actor=user["email"],
        ref_id=topup.transaction_ref,
    ))
    await db.commit()
    await db.refresh(topup)
    return TreasuryTopUpSimulationResponse(
        topup=_topup_response(topup),
        simulation_response=simulation_resp,
        verification_response=verification_resp,
    )


@router.get("/topups/{topup_id}/redirect", response_class=HTMLResponse)
async def treasury_topup_redirect(
    topup_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    topup = await _get_topup_or_404(db, topup_id)
    verify_error = None
    previous_status = topup.status
    tx_ref = request.query_params.get("transaction_ref") or topup.transaction_ref

    try:
        verify_resp = await squad_client.verify_transaction(tx_ref)
        if verify_resp.get("success") is True or verify_resp.get("status") == 200:
            current_status = _apply_topup_from_verify(topup, verify_resp)
            if current_status != previous_status:
                db.add(AuditEvent(
                    type="treasury",
                    title=f"Treasury top-up {current_status}",
                    detail=f"tx_ref={topup.transaction_ref}",
                    actor="squad.redirect",
                    ref_id=topup.transaction_ref,
                ))
            db.add(topup)
            await db.commit()
            await db.refresh(topup)
    except Exception as exc:
        verify_error = str(exc)

    return HTMLResponse(_render_topup_redirect_page(topup, verify_error=verify_error))
