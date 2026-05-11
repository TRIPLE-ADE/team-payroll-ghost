import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models.audit import AuditEvent
from app.models.employee import Employee
from app.models.investigation import Investigation
from app.models.payment import PaymentAction
from app.models.payroll import FlaggedRow, PayrollHistory
from app.schemas.employee import EmployeeProfile, PayrollHistoryMonth
from app.schemas.investigation import (
    ActionResponse,
    ExplainableFactor,
    InvestigationActionRequest,
    InvestigationDetail,
    Investigation as InvestigationSchema,
    TimelineEvent,
    TrustPoint,
)
from app.services.squad_client import squad_client

router = APIRouter(prefix="/api/v1/investigations", tags=["investigations"])


# ── Serializer helpers ───────────────────────────────────────────────────────

def _inv_to_schema(inv: Investigation) -> InvestigationSchema:
    return InvestigationSchema(
        id=str(inv.id),
        employeeId=inv.emp_id or str(inv.employee_id),
        cycleId=str(inv.cycle_id),
        status=inv.status,
        openedAt=inv.opened_at.isoformat(),
        explainableFactors=[ExplainableFactor(**f) for f in (inv.explainable_factors or [])],
        timeline=[TimelineEvent(**t) for t in (inv.timeline or [])],
        trustSeries=[TrustPoint(**p) for p in (inv.trust_series or [])],
    )


async def _build_employee_profile(db: AsyncSession, emp: Employee) -> EmployeeProfile:
    # Peer group avg trust
    dept_avg_result = await db.execute(
        select(func.avg(Employee.trust_score)).where(
            Employee.department == emp.department,
            Employee.id != emp.id,
        )
    )
    peer_avg = int(dept_avg_result.scalar() or 75)

    history_result = await db.execute(
        select(PayrollHistory)
        .where(PayrollHistory.employee_id == emp.id)
        .order_by(PayrollHistory.created_at.asc())
        .limit(6)
    )
    history = history_result.scalars().all()

    return EmployeeProfile(
        id=emp.emp_id,
        name=emp.name,
        role=emp.role,
        department=emp.department,
        verificationExpiresAt=emp.verification_expires_at.isoformat() if emp.verification_expires_at else None,
        verificationStatus=emp.verification_status,
        trustScore=emp.trust_score,
        peerGroupAvgTrust=peer_avg,
        payrollHistoryMonths=[
            PayrollHistoryMonth(month=h.month_label or "—", amount=float(h.net_amount or 0))
            for h in history
        ],
    )


async def _append_timeline(inv: Investigation, event: dict) -> None:
    timeline = list(inv.timeline or [])
    timeline.append(event)
    inv.timeline = timeline


async def _append_trust(inv: Investigation, score: int) -> None:
    series = list(inv.trust_series or [])
    series.append({"at": datetime.now(timezone.utc).isoformat(), "score": score})
    inv.trust_series = series


async def _audit(db: AsyncSession, event_type: str, title: str, detail: str, ref_id: str) -> None:
    db.add(AuditEvent(type=event_type, title=title, detail=detail, actor="operator.console", ref_id=ref_id))


async def _upsert_payment_action(
    db: AsyncSession,
    emp: Employee,
    inv: Investigation,
    state: str,
    history_entry: dict,
    squad_ref: str | None = None,
    squad_tx_status: str | None = None,
    net_amount: float | None = None,
) -> PaymentAction:
    result = await db.execute(
        select(PaymentAction).where(
            PaymentAction.employee_id == emp.id,
            PaymentAction.cycle_id == inv.cycle_id,
        )
    )
    pa = result.scalar_one_or_none()
    if pa:
        pa.state = state
        pa.history = list(pa.history or []) + [history_entry]
        if squad_ref:
            pa.squad_ref = squad_ref
        if squad_tx_status:
            pa.squad_tx_status = squad_tx_status
    else:
        pa = PaymentAction(
            employee_id=emp.id,
            cycle_id=inv.cycle_id,
            state=state,
            net_amount=net_amount or float(emp.salary or 0),
            squad_ref=squad_ref,
            squad_tx_status=squad_tx_status,
            history=[history_entry],
        )
        db.add(pa)
    return pa


# ── Routes ───────────────────────────────────────────────────────────────────

@router.get("", response_model=list[InvestigationSchema])
async def list_investigations(
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    q = select(Investigation).order_by(Investigation.opened_at.desc())
    if status:
        q = q.where(Investigation.status == status)
    result = await db.execute(q)
    return [_inv_to_schema(i) for i in result.scalars().all()]


@router.get("/{investigation_id}", response_model=InvestigationDetail)
async def get_investigation(
    investigation_id: str,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    inv = await db.get(Investigation, uuid.UUID(investigation_id))
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
    emp = await db.get(Employee, inv.employee_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return InvestigationDetail(
        investigation=_inv_to_schema(inv),
        employee=await _build_employee_profile(db, emp),
    )


@router.post("/{investigation_id}/actions", response_model=ActionResponse)
async def submit_action(
    investigation_id: str,
    body: InvestigationActionRequest,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    inv = await db.get(Investigation, uuid.UUID(investigation_id))
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")

    emp = await db.get(Employee, inv.employee_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    now = datetime.now(timezone.utc).isoformat()

    # Find the flagged row for this investigation
    fr_result = await db.execute(
        select(FlaggedRow).where(FlaggedRow.investigation_id == inv.id)
    )
    flagged_row = fr_result.scalar_one_or_none()

    action = body.type

    # ── pause_payment ────────────────────────────────────────────────────────
    if action == "pause_payment":
        if flagged_row:
            flagged_row.payment_status = "paused"
            db.add(flagged_row)

        await _upsert_payment_action(
            db, emp, inv, "paused",
            {"at": now, "action": "Disbursement paused — integrity hold", "actor": "operator.console"},
        )
        await _append_timeline(inv, {
            "id": f"t{len(inv.timeline or []) + 1}",
            "type": "intervention",
            "summary": "Payment paused pending investigation",
            "severity": "high",
            "detectedAt": now,
            "trustAtPoint": emp.trust_score,
        })
        await _audit(db, "intervention", "Payment paused", f"{emp.emp_id} — manual hold", investigation_id)
        db.add(inv)

    # ── approve_payment ──────────────────────────────────────────────────────
    elif action == "approve_payment":
        # Step 1: Create/validate virtual account with BVN
        verified_account_name = None
        if emp.bvn:
            name_parts = emp.name.split()
            first = name_parts[0] if name_parts else emp.name
            last = name_parts[-1] if len(name_parts) > 1 else emp.name
            va_response = await squad_client.create_virtual_account(
                emp_id=emp.emp_id,
                first_name=first,
                last_name=last,
                bvn=emp.bvn,
                dob=emp.dob or "01/01/1990",
                gender=emp.gender or "M",
            )

            if va_response["status"] == "BVN_MISMATCH":
                await _audit(
                    db, "verification",
                    "BVN validation failed — payment blocked",
                    va_response.get("reason", "BVN validation failed"),
                    investigation_id,
                )
                await db.commit()
                return ActionResponse(ok=False, message=f"BVN mismatch: {va_response.get('reason')}")

            verified_account_name = va_response.get("account_name")

        # Step 2: Lookup account to confirm routing (optional but recommended)
        if emp.account_number and emp.bank_code:
            try:
                lookup_resp = await squad_client.lookup_account(
                    account_number=emp.account_number,
                    bank_code=emp.bank_code,
                )
                if lookup_resp.get("status") != "success":
                    await _audit(
                        db, "intervention",
                        "Account lookup failed",
                        f"Account {emp.account_number} invalid or inactive",
                        investigation_id,
                    )
                    await db.commit()
                    return ActionResponse(ok=False, message="Account validation failed")
            except Exception as lookup_err:
                # Log but don't block — continue with verified_account_name
                await _audit(db, "intervention", "Account lookup error", str(lookup_err), investigation_id)

        # Step 3: Fire Squad transfer with verified account name
        squad_ref = None
        squad_status = None
        if emp.account_number and emp.bank_code and verified_account_name:
            tx_ref = squad_client.build_tx_ref(emp.emp_id)
            amount_kobo = int(float(emp.salary or 0) * 100)
            try:
                transfer_resp = await squad_client.transfer(
                    account_number=emp.account_number,
                    bank_code=emp.bank_code,
                    account_name=verified_account_name,  # REQUIRED by Squad
                    amount_kobo=amount_kobo,
                    tx_ref=tx_ref,
                    narration=f"Salary payment — {emp.emp_id}",
                )
                squad_ref = tx_ref
                squad_status = "pending"
            except Exception as e:
                squad_status = "failed"
                await _audit(db, "intervention", "Transfer initiation failed", str(e), investigation_id)

        if flagged_row:
            flagged_row.payment_status = "approved"
            db.add(flagged_row)

        inv.status = "closed"
        if flagged_row:
            flagged_row.investigation_status = "closed"
            db.add(flagged_row)

        await _upsert_payment_action(
            db, emp, inv, "released",
            {"at": now, "action": "Payment approved and released for disbursement", "actor": "operator.console"},
            squad_ref=squad_ref,
            squad_tx_status=squad_status,
            net_amount=float(emp.salary or 0),
        )
        await _append_timeline(inv, {
            "id": f"t{len(inv.timeline or []) + 1}",
            "type": "intervention",
            "summary": "Payment approved — cleared for disbursement",
            "severity": "low",
            "detectedAt": now,
            "trustAtPoint": emp.trust_score,
        })
        await _audit(db, "intervention", "Payment approved", f"{emp.emp_id} — cleared for disbursement", investigation_id)
        db.add(inv)

    # ── escalate ─────────────────────────────────────────────────────────────
    elif action == "escalate":
        inv.status = "escalated"
        if flagged_row:
            flagged_row.investigation_status = "escalated"
            db.add(flagged_row)
        await _append_timeline(inv, {
            "id": f"t{len(inv.timeline or []) + 1}",
            "type": "escalation",
            "summary": "Escalated to regional workforce integrity",
            "severity": "medium",
            "detectedAt": now,
            "trustAtPoint": emp.trust_score,
        })
        await _audit(db, "investigation", "Investigation escalated", f"{investigation_id} — tier-2 queue", investigation_id)
        db.add(inv)

    # ── request_verification ─────────────────────────────────────────────────
    elif action == "request_verification":
        squad_result = {"status": "NO_BVN"}
        if emp.bvn:
            name_parts = emp.name.split()
            first = name_parts[0] if name_parts else emp.name
            last = name_parts[-1] if len(name_parts) > 1 else emp.name
            squad_result = await squad_client.validate_bvn(
                emp_id=emp.emp_id,
                first_name=first,
                last_name=last,
                bvn=emp.bvn,
                dob=emp.dob or "01/01/1990",
                gender=emp.gender or "M",
            )

        verified = squad_result["status"] == "BVN_VALID"
        emp.verification_status = "current" if verified else "expired"
        db.add(emp)

        await _audit(
            db, "verification",
            "BVN verification requested",
            f"{emp.emp_id} — result: {squad_result['status']}",
            investigation_id,
        )

    else:
        raise HTTPException(status_code=400, detail=f"Unknown action type: {action}")

    await db.commit()
    return ActionResponse(ok=True, message="Action recorded")
