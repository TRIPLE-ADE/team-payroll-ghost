"""
Background task: runs after POST /api/v1/payroll/cycles/:id/analyze.
Calls ML service → writes flagged rows + investigations → updates cycle status.
"""
import uuid
from datetime import datetime, timezone

import pandas as pd
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditEvent
from app.models.investigation import Investigation
from app.models.payroll import FlaggedRow, PayrollCycle, PayrollHistory
from app.models.employee import Employee
from app.models.relationship import RelationshipEdge, RelationshipNode
from app.services.ml_client import ml_client


# ── Risk tier helpers ────────────────────────────────────────────────────────

def tier_to_severity(tier: str) -> str:
    return {"Critical": "high", "High": "high", "Medium": "medium", "Low": "low"}.get(tier, "low")


def tier_to_trust(tier: str, current: int) -> int:
    """Map ML tier to a trust score. Preserves relative ordering within tier bands."""
    if tier == "Critical":
        return min(current, 35)
    if tier == "High":
        return min(current, 58)
    if tier == "Medium":
        return min(current, 73)
    return min(current, 100)


def build_explainable_factors(flags: list[str], final_score: float, tier: str) -> list[dict]:
    """Convert ML flag strings into ExplainableFactor objects."""
    confidence_base = {"Critical": 90, "High": 78, "Medium": 62, "Low": 45}.get(tier, 60)
    factors = []
    for i, flag in enumerate(flags):
        confidence = max(55, confidence_base - i * 3)
        factors.append({
            "id": f"f{i + 1}",
            "title": flag.split("—")[0].strip() if "—" in flag else flag[:60],
            "detail": flag,
            "confidence": confidence,
            "evidence": [flag],
        })
    return factors


def build_anomaly_labels(flags: list[str], tier: str) -> list[str]:
    """Shorten ML flags to concise anomaly label strings."""
    label_map = {
        "Shared bank account": "Shared bank account",
        "Shared BVN": "Shared BVN — duplicate identity",
        "Shared NIN": "Shared NIN — duplicate identity",
        "Salary": "Salary above grade ceiling",
        "Zero attendance": "Zero attendance recorded",
        "No deductions": "No deductions applied",
        "No leave": "No leave taken",
        "Average attendance": "Low attendance pattern",
        "No promotion": "No promotion in 5+ years",
    }
    labels = []
    for flag in flags:
        matched = False
        for key, label in label_map.items():
            if key.lower() in flag.lower():
                if label not in labels:
                    labels.append(label)
                matched = True
                break
        if not matched:
            labels.append(flag[:50])
    return labels or [f"{tier} risk anomaly"]


# ── Main background task ─────────────────────────────────────────────────────

async def run_analysis(cycle_id: str, db: AsyncSession) -> None:
    cycle_uuid = uuid.UUID(cycle_id)

    # 1. Fetch employees for this cycle via payroll_history
    result = await db.execute(
        select(Employee)
        .join(PayrollHistory, PayrollHistory.employee_id == Employee.id)
        .where(PayrollHistory.cycle_id == cycle_uuid)
    )
    employees = result.scalars().all()

    if not employees:
        await _mark_cycle(db, cycle_uuid, "ready", 0, 0, 100)
        await db.commit()
        return

    # 2. Build in-memory CSV for ML service — full schema for analyze, minimal for duplicates
    rows = []
    dup_rows = []
    for emp in employees:
        row = {
            "emp_id": emp.emp_id,
            "salary": float(emp.salary or 0),
            "grade_level": emp.grade_level or "GL-07",
            "tenure_months": emp.tenure_months or 0,
            "bvn": emp.bvn or "",
            "nin": emp.nin or "",
            "account_number": emp.account_number or "",
            "avg_attendance_days": float(emp.avg_attendance_days or 20),
            "months_no_deduction": emp.months_no_deduction or 0,
            "leave_days_taken": emp.leave_days_taken or 0,
            "promotion_count": emp.promotion_count or 0,
        }
        rows.append(row)
        # Duplicates detection only needs 4 fields
        dup_rows.append({
            "emp_id": emp.emp_id,
            "bvn": emp.bvn or "",
            "nin": emp.nin or "",
            "account_number": emp.account_number or "",
        })

    df = pd.DataFrame(rows)
    csv_bytes = df.to_csv(index=False).encode()

    dup_df = pd.DataFrame(dup_rows)
    dup_csv_bytes = dup_df.to_csv(index=False).encode()

    # 3. Call ML service
    try:
        batch_result = await ml_client.analyze_batch(csv_bytes)
        dup_result = await ml_client.detect_duplicates(dup_csv_bytes)
    except Exception as e:
        await _mark_cycle(db, cycle_uuid, "ready", 0, 0, 100)
        await _append_audit(db, "anomaly", "Analysis error", str(e), "engine.anomaly", cycle_id)
        await db.commit()
        return

    scored = {r["emp_id"]: r for r in batch_result.get("results", [])}
    dup_pairs = dup_result.get("pairs", [])

    # 4. Build emp_id → Employee lookup
    emp_map = {e.emp_id: e for e in employees}

    # 5. Process duplicate pairs — shared account nodes/edges
    dup_emp_ids: set[str] = set()
    for pair in dup_pairs:
        dup_emp_ids.add(pair["emp_id_a"])
        dup_emp_ids.add(pair["emp_id_b"])
        field = pair.get("match_field", "ACCT").upper()
        cluster_id = f"cluster-{pair['emp_id_a']}-{pair['emp_id_b']}"
        await _upsert_node(db, cluster_id, f"Payout cluster {field}", "cluster", "high")
        for eid in [pair["emp_id_a"], pair["emp_id_b"]]:
            emp = emp_map.get(eid)
            if emp:
                await _upsert_node(db, emp.emp_id, emp.name, "employee", "high")
                await _upsert_edge(db, emp.emp_id, cluster_id, "shared routing")

    # 6. Process each scored employee
    flagged_count = 0
    now_iso = datetime.now(timezone.utc).isoformat()

    for emp in employees:
        score = scored.get(emp.emp_id)
        if not score:
            continue

        tier = score.get("risk_tier", "Low")
        final_score = float(score.get("final_score", 0))
        flags = score.get("flags", [])
        ml_score = float(score.get("scores", {}).get("ml", 0))
        action = score.get("recommended_action", "CLEAR")

        # If this employee had a duplicate pair, add that flag
        if emp.emp_id in dup_emp_ids:
            flags = ["Duplicate payout cluster detected"] + flags
            if tier not in ("Critical", "High"):
                tier = "High"

        # Update employee trust score
        prev_trust = emp.trust_score
        new_trust = tier_to_trust(tier, prev_trust)
        emp.trust_previous = prev_trust
        emp.trust_score = new_trust
        db.add(emp)

        if tier not in ("High", "Critical", "Medium"):
            continue

        # Create flagged row
        severity = tier_to_severity(tier)
        anomaly_labels = build_anomaly_labels(flags, tier)

        flagged = FlaggedRow(
            cycle_id=cycle_uuid,
            employee_id=emp.id,
            trust_score=new_trust,
            trust_previous=prev_trust,
            anomaly_labels=anomaly_labels,
            attendance_notes=[f"Avg attendance: {emp.avg_attendance_days} days/month"] if emp.avg_attendance_days is not None else [],
            payment_status="scheduled",
            investigation_status="open" if tier in ("High", "Critical") else "none",
            severity=severity,
            ml_score=ml_score,
            final_score=final_score,
            recommended_action=action,
            raw_flags={"flags": flags, "scores": score.get("scores", {})},
        )
        db.add(flagged)
        await db.flush()  # get flagged.id

        if tier in ("High", "Critical"):
            flagged_count += 1
            factors = build_explainable_factors(flags, final_score, tier)
            trust_series = [{"at": now_iso, "score": new_trust}]

            inv = Investigation(
                employee_id=emp.id,
                emp_id=emp.emp_id,
                cycle_id=cycle_uuid,
                status="open",
                explainable_factors=factors,
                timeline=[{
                    "id": "t1",
                    "type": "anomaly",
                    "summary": f"{tier} risk detected — score {final_score:.1f}",
                    "severity": severity,
                    "detectedAt": now_iso,
                    "trustAtPoint": new_trust,
                }],
                trust_series=trust_series,
            )
            db.add(inv)
            await db.flush()

            flagged.investigation_id = inv.id
            db.add(flagged)

    # 7. Update cycle
    total = len(employees)
    integrity = max(0, round(100 - (flagged_count / total * 100))) if total > 0 else 100
    await _mark_cycle(db, cycle_uuid, "ready", flagged_count, 0, integrity)

    # 8. Append audit event
    await _append_audit(
        db, "anomaly",
        "Integrity analysis complete",
        f"{flagged_count} case(s) queued for review",
        "engine.anomaly",
        cycle_id,
    )

    await db.commit()


# ── Helpers ──────────────────────────────────────────────────────────────────

async def _mark_cycle(
    db: AsyncSession,
    cycle_id: uuid.UUID,
    status: str,
    flagged: int,
    paused: int,
    integrity: int,
) -> None:
    await db.execute(
        update(PayrollCycle)
        .where(PayrollCycle.id == cycle_id)
        .values(
            processing_status=status,
            flagged_count=flagged,
            paused_payments=paused,
            integrity_score=integrity,
        )
    )


async def _append_audit(
    db: AsyncSession,
    event_type: str,
    title: str,
    detail: str,
    actor: str,
    ref_id: str | None = None,
) -> None:
    db.add(AuditEvent(type=event_type, title=title, detail=detail, actor=actor, ref_id=ref_id))


async def _upsert_node(db: AsyncSession, node_id: str, label: str, ntype: str, risk: str | None) -> None:
    result = await db.execute(select(RelationshipNode).where(RelationshipNode.id == node_id))
    node = result.scalar_one_or_none()
    if node:
        node.label = label
        node.risk = risk
    else:
        db.add(RelationshipNode(id=node_id, label=label, type=ntype, risk=risk))


async def _upsert_edge(db: AsyncSession, source: str, target: str, label: str) -> None:
    result = await db.execute(
        select(RelationshipEdge)
        .where(RelationshipEdge.source == source, RelationshipEdge.target == target)
    )
    if not result.scalar_one_or_none():
        db.add(RelationshipEdge(source=source, target=target, label=label))
