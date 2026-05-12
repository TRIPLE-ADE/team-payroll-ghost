#!/usr/bin/env python3
"""
GhostGuard Flask API — app.py
Full REST API for ghost worker detection + vendor trust scoring
Run: python app.py  →  http://localhost:5000/apidocs
"""

import os, json, hashlib, sqlite3, datetime, joblib
import numpy as np
import pandas as pd
from pathlib import Path
from flask import Flask, request, jsonify, g
from flasgger import Swagger

BASE      = Path(__file__).parent
print(f"[GhostGuard] Base directory: {BASE}")
MODEL_DIR = BASE / "models"
DATA_DIR  = BASE / "data"
SALT      = os.environ.get("ANON_SALT", "ghostguard-hackathon-2025-salt")

# ── Load models ───────────────────────────────────────────────────────────────
print("[GhostGuard] Loading models...")
ISO_MODEL  = joblib.load(MODEL_DIR / "isolation_forest.pkl")
ISO_SCALER = joblib.load(MODEL_DIR / "iso_scaler.pkl")
XGB_MODEL  = joblib.load(MODEL_DIR / "xgboost_ghost.pkl")
XGB_FEATS  = joblib.load(MODEL_DIR / "xgb_features.pkl")
with open(MODEL_DIR / "metadata.json") as f:
    META = json.load(f)
GRADE_CEILING = {int(k): v for k, v in META["grade_ceiling"].items()}
print("[GhostGuard] Models loaded ✓")

FEATURE_COLS = [
    "salary", "grade_num", "tenure_months",
    "avg_attendance_days", "months_no_deduction",
    "leave_days_taken", "promotion_count",
    "salary_above_grade_ceiling", "acct_shared", "bvn_shared", "nin_shared",
]

app = Flask(__name__)

swagger_template = {
    "swagger": "2.0",
    "info": {
        "title": "GhostGuard API",
        "description": (
            "## AI-Powered Nigerian Payroll Ghost Worker Detection\n\n"
            "Three detection layers running in sequence:\n\n"
            "**Layer 1 — Heuristic Rules:** Deterministic flags. Zero training needed.\n\n"
            "**Layer 2 — Isolation Forest:** Unsupervised anomaly detection. Catches pattern outliers.\n\n"
            "**Layer 3 — XGBoost:** Supervised ML classifier. AUC = 1.00 on test set.\n\n"
            "**Layer 4 — Duplicate Detection:** Same person on two payroll records.\n\n"
            "All PII (BVN, NIN, account number) is SHA-256 hashed before any model processes it."
        ),
        "version": "1.0.0",
    },
    "basePath": "/",
    "tags": [
        {"name": "Detection",  "description": "Ghost worker scoring"},
        {"name": "Duplicates", "description": "Same-person duplicate detection"},
        {"name": "Audit",      "description": "Investigator decision log"},
        {"name": "System",     "description": "Health and stats"},
    ]
}
swagger = Swagger(app, template=swagger_template)


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(str(DATA_DIR / "audit.db"))
        g.db.row_factory = sqlite3.Row
        g.db.execute("""CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            emp_id TEXT, action TEXT, reason TEXT,
            investigator_id TEXT, final_score REAL,
            risk_tier TEXT, timestamp TEXT
        )""")
        g.db.commit()
    return g.db

@app.teardown_appcontext
def close_db(e):
    db = g.pop("db", None)
    if db: db.close()

def anon(v):
    return hashlib.sha256(f"{SALT}{str(v)}".encode()).hexdigest()[:20]

def score_employee(record: dict, context_bvns=None, context_nins=None, context_accts=None) -> dict:
    # Anonymize PII
    bvn_hash  = anon(record.get("bvn", ""))
    nin_hash  = anon(record.get("nin", ""))
    acct_hash = anon(record.get("account_number", ""))

    grade_num  = int(str(record.get("grade_level", "GL-07")).split("-")[-1])
    salary     = float(record.get("salary", 0))
    grade_ceil = GRADE_CEILING.get(grade_num, 999_999)
    tenure     = int(record.get("tenure_months", 0))

    feat = {
        "salary":                     salary,
        "grade_num":                  grade_num,
        "tenure_months":              tenure,
        "avg_attendance_days":        float(record.get("avg_attendance_days", 20)),
        "months_no_deduction":        int(record.get("months_no_deduction", 0)),
        "leave_days_taken":           int(record.get("leave_days_taken", 0)),
        "promotion_count":            int(record.get("promotion_count", 0)),
        "salary_above_grade_ceiling": int(salary > grade_ceil * 1.05),
        "acct_shared": int(acct_hash in (context_accts or set())),
        "bvn_shared":  int(bvn_hash  in (context_bvns  or set())),
        "nin_shared":  int(nin_hash  in (context_nins  or set())),
    }

    hs = 0
    flags = []
    if feat["acct_shared"]:
        hs += 80; flags.append("Shared bank account across multiple employees")
    if feat["bvn_shared"]:
        hs += 75; flags.append("Shared BVN — possible duplicate identity")
    if feat["nin_shared"]:
        hs += 75; flags.append("Shared NIN — possible duplicate identity")
    if feat["salary_above_grade_ceiling"]:
        pct = round((salary/grade_ceil - 1)*100, 1)
        hs += 70; flags.append(f"Salary {pct}% above GL-{grade_num} ceiling (₦{grade_ceil:,})")
    if feat["avg_attendance_days"] == 0 and tenure >= 12:
        hs += 65; flags.append("Zero attendance in 12+ months on payroll")
    if feat["months_no_deduction"] == tenure and tenure > 0:
        hs += 55; flags.append("No deductions applied for entire tenure")
    if feat["leave_days_taken"] == 0 and tenure > 36:
        hs += 45; flags.append("No leave taken in 3+ years of service")
    if feat["avg_attendance_days"] < 5 and tenure >= 6:
        hs += 40; flags.append(f"Average attendance {feat['avg_attendance_days']} days/month")
    if feat["promotion_count"] == 0 and tenure > 60:
        hs += 25; flags.append("No promotion in 5+ years of service")
    hs = min(100, hs)

    # Layer 2 — Isolation Forest
    X_iso = ISO_SCALER.transform([[feat[c] for c in FEATURE_COLS]])
    iso_raw   = float(ISO_MODEL.score_samples(X_iso)[0])
    iso_flag  = int(ISO_MODEL.predict(X_iso)[0])
    iso_score = float(np.clip((-iso_raw - 0.1) / 0.5 * 100, 0, 100))

    # Layer 3 — XGBoost
    feat_xgb = {**feat, "heuristic_score": hs, "anomaly_score": iso_score}
    X_xgb    = [[feat_xgb.get(c, 0) for c in XGB_FEATS]]
    ml_score = float(XGB_MODEL.predict_proba(X_xgb)[0][1]) * 100

    # Composite
    final = min(100, round(hs*0.35 + iso_score*0.25 + ml_score*0.40, 2))
    tier  = ("Critical" if final >= 80 else
             "High"     if final >= 60 else
             "Medium"   if final >= 30 else "Low")
    action = ("PAUSE_PAYMENT_AND_ESCALATE" if tier == "Critical" else
               "FLAG_FOR_REVIEW"           if tier == "High"     else
               "MONITOR"                   if tier == "Medium"   else "CLEAR")

    # Validation warnings
    warnings = []
    bvn = str(record.get("bvn",""))
    nin = str(record.get("nin",""))
    acct = str(record.get("account_number",""))
    if bvn and (not bvn.isdigit() or len(bvn) != 11):
        warnings.append("BVN must be 11 digits (CBN standard)")
    if nin and (not nin.isdigit() or len(nin) != 11):
        warnings.append("NIN must be 11 digits (NIMC standard)")
    if acct and (not acct.isdigit() or len(acct) != 10):
        warnings.append("Account number must be 10 digits (CBN NUBAN standard)")

    return {
        "emp_id":      record.get("emp_id", "UNKNOWN"),
        "risk_tier":   tier,
        "final_score": final,
        "scores": {
            "heuristic": round(hs, 2),
            "anomaly":   round(iso_score, 2),
            "ml":        round(ml_score, 2),
        },
        "anomaly_detected": iso_flag == -1,
        "flags":            flags,
        "flag_count":       len(flags),
        "recommended_action": action,
        "anonymized_ids": {
            "bvn_hash":  bvn_hash,
            "nin_hash":  nin_hash,
            "acct_hash": acct_hash,
        },
        "validation_warnings": warnings,
    }

@app.route("/")
def index():
    return jsonify({
        "service": "GhostGuard API", "version": "1.0.0",
        "docs": "/apidocs",
        "endpoints": {
            "POST": ["/api/v1/analyze/employee",
                     "/api/v1/analyze/batch",
                     "/api/v1/detect/duplicates",
                     "/api/v1/audit/log"],
            "GET":  ["/api/v1/stats",
                     "/api/v1/audit/history",
                     "/health"]
        }
    })

@app.route("/health")
def health():
    """
    ---
    tags: [System]
    summary: Health check
    responses:
      200:
        description: OK
    """
    return jsonify({"status": "ok",
                    "timestamp": datetime.datetime.utcnow().isoformat()})

@app.route("/api/v1/stats")
def stats():
    """
    ---
    tags: [System]
    summary: Model performance and dataset statistics
    responses:
      200:
        description: Stats object
    """
    return jsonify({
        "model": {
            "layers":      ["Heuristic Rules","Isolation Forest","XGBoost"],
            "xgboost_auc": META["xgboost_auc"],
            "trained_at":  META["trained_at"],
        },
        "dataset": {
            "total_records":   META["total_records"],
            "ghost_records":   META["ghost_records"],
            "ghost_rate_pct":  META["ghost_rate"],
            "critical_flagged":META["critical_flagged"],
            "high_flagged":    META["high_flagged"],
            "duplicate_pairs": META["duplicate_pairs"],
        },
        "nigerian_standards": {
            "bvn":  "11 digits, starts with 2 (CBN)",
            "nin":  "11 digits (NIMC)",
            "nuban":"10 digits (CBN NUBAN)",
        }
    })

@app.route("/api/v1/analyze/employee", methods=["POST"])
def analyze_employee():
    """
    ---
    tags: [Detection]
    summary: Score a single employee for ghost worker risk
    description: |
      Runs through all 3 AI layers. PII is SHA-256 hashed before processing.
      Returns risk tier (Low/Medium/High/Critical), composite score, and flags.
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [emp_id, salary, grade_level, tenure_months]
          properties:
            emp_id: {type: string, example: "EMP001234"}
            bvn: {type: string, example: "22345678901", description: "11-digit CBN BVN"}
            nin: {type: string, example: "12345678901", description: "11-digit NIMC NIN"}
            account_number: {type: string, example: "0123456789", description: "10-digit NUBAN"}
            grade_level: {type: string, example: "GL-09"}
            salary: {type: number, example: 280000}
            tenure_months: {type: integer, example: 36}
            avg_attendance_days: {type: number, example: 2}
            months_no_deduction: {type: integer, example: 36}
            leave_days_taken: {type: integer, example: 0}
            promotion_count: {type: integer, example: 0}
    responses:
      200:
        description: Risk assessment
      400:
        description: Missing required fields
    """
    data = request.get_json(silent=True)
    print(f"[GhostGuard] Received employee analysis request: {data}")
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400
    missing = [f for f in ["emp_id","salary","grade_level","tenure_months"] if f not in data]
    if missing:
        return jsonify({"error": f"Missing fields: {missing}"}), 400
    return jsonify(score_employee(data)), 200


@app.route("/api/v1/analyze/batch", methods=["POST"])
def analyze_batch():
    """
    ---
    tags: [Detection]
    summary: Score a batch of employees from CSV upload
    description: |
      Upload a CSV. Returns all records scored and sorted highest risk first.
      Also computes cross-record signals (shared BVN/NIN/account).
      Required CSV columns: emp_id, salary, grade_level, tenure_months
      Optional: bvn, nin, account_number, avg_attendance_days,
                months_no_deduction, leave_days_taken, promotion_count
    consumes: [multipart/form-data]
    parameters:
      - in: formData
        name: file
        type: file
        required: true
    responses:
      200:
        description: Batch results with summary
      400:
        description: Bad file
    """
    if "file" not in request.files:
        return jsonify({"error": "No file — use form-data key 'file'"}), 400
    try:
        df = pd.read_csv(request.files["file"])
    except Exception as e:
        return jsonify({"error": f"Cannot parse CSV: {e}"}), 400

    # Build duplicate-aware hash sets for cross-record signals
    def build_dup_set(col, raw_col):
        if raw_col not in df.columns:
            return set()
        hashed = df[raw_col].astype(str).apply(anon)
        counts = hashed.value_counts()
        return set(counts[counts > 1].index)

    dup_bvns  = build_dup_set("bvn_hash",  "bvn")
    dup_nins  = build_dup_set("nin_hash",  "nin")
    dup_accts = build_dup_set("acct_hash", "account_number")

    results = [
        score_employee(row.to_dict(), dup_bvns, dup_nins, dup_accts)
        for _, row in df.iterrows()
    ]
    results.sort(key=lambda x: x["final_score"], reverse=True)

    tiers = [r["risk_tier"] for r in results]
    return jsonify({
        "summary": {
            "total":    len(results),
            "critical": tiers.count("Critical"),
            "high":     tiers.count("High"),
            "medium":   tiers.count("Medium"),
            "low":      tiers.count("Low"),
            "avg_score": round(float(np.mean([r["final_score"] for r in results])), 2),
        },
        "results": results
    }), 200


@app.route("/api/v1/detect/duplicates", methods=["POST"])
def detect_duplicates():
    """
    ---
    tags: [Duplicates]
    summary: Find same-person duplicate records (one person, two salaries)
    description: |
      Upload a CSV. Finds all record pairs that share BVN, NIN, or account number
      — indicating the same person appears on payroll twice.
      Required columns: emp_id, bvn OR nin OR account_number
    consumes: [multipart/form-data]
    parameters:
      - in: formData
        name: file
        type: file
        required: true
    responses:
      200:
        description: List of duplicate pairs
      400:
        description: Bad file
    """
    if "file" not in request.files:
        return jsonify({"error": "No file — use form-data key 'file'"}), 400
    try:
        df = pd.read_csv(request.files["file"])
    except Exception as e:
        return jsonify({"error": f"Cannot parse CSV: {e}"}), 400

    match_cols = {
        "bvn":            ("BVN match — same identity document",    0.97),
        "nin":            ("NIN match — same national ID number",    0.97),
        "account_number": ("Same bank account receiving two salaries", 0.99),
    }

    pairs = []
    seen  = set()
    for raw_col, (evidence, prob) in match_cols.items():
        if raw_col not in df.columns:
            continue
        df[f"_{raw_col}_hash"] = df[raw_col].astype(str).apply(anon)
        duped = df[df[f"_{raw_col}_hash"].duplicated(keep=False)]
        for _, grp in duped.groupby(f"_{raw_col}_hash"):
            ids = grp["emp_id"].astype(str).tolist()
            for i in range(len(ids)):
                for j in range(i+1, len(ids)):
                    key = tuple(sorted([ids[i], ids[j]]))
                    if key not in seen:
                        seen.add(key)
                        pairs.append({
                            "emp_id_a":           ids[i],
                            "emp_id_b":           ids[j],
                            "match_field":        raw_col.upper(),
                            "match_evidence":     evidence,
                            "match_probability":  prob,
                            "recommended_action": "FREEZE_BOTH_AND_INVESTIGATE"
                        })

    return jsonify({
        "total_records":  len(df),
        "duplicate_pairs": len(pairs),
        "pairs":           pairs
    }), 200


@app.route("/api/v1/audit/log", methods=["POST"])
def audit_log():
    """
    ---
    tags: [Audit]
    summary: Log an investigator decision on a flagged employee
    description: |
      Actions: FLAG | CLEAR | ESCALATE | PAUSE_PAYMENT | REINSTATE
      Each logged decision becomes a future training label (active learning).
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [emp_id, action, investigator_id]
          properties:
            emp_id:          {type: string,  example: "EMP001234"}
            action:          {type: string,  example: "PAUSE_PAYMENT",
                              enum: [FLAG, CLEAR, ESCALATE, PAUSE_PAYMENT, REINSTATE]}
            reason:          {type: string,  example: "Confirmed shared BVN with EMP005678"}
            investigator_id: {type: string,  example: "INV001"}
            final_score:     {type: number,  example: 87.4}
            risk_tier:       {type: string,  example: "Critical"}
    responses:
      201:
        description: Decision logged
      400:
        description: Missing fields
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "JSON body required"}), 400
    missing = [f for f in ["emp_id","action","investigator_id"] if f not in data]
    if missing:
        return jsonify({"error": f"Missing: {missing}"}), 400

    valid_actions = {"FLAG","CLEAR","ESCALATE","PAUSE_PAYMENT","REINSTATE"}
    if data["action"] not in valid_actions:
        return jsonify({"error": f"action must be one of {valid_actions}"}), 400

    db = get_db()
    db.execute(
        "INSERT INTO audit_log (emp_id,action,reason,investigator_id,final_score,risk_tier,timestamp) VALUES (?,?,?,?,?,?,?)",
        (data["emp_id"], data["action"], data.get("reason",""),
         data["investigator_id"], data.get("final_score"), data.get("risk_tier"),
         datetime.datetime.utcnow().isoformat())
    )
    db.commit()

    total = db.execute("SELECT COUNT(*) FROM audit_log").fetchone()[0]
    return jsonify({
        "logged": True,
        "emp_id": data["emp_id"],
        "action": data["action"],
        "total_decisions": total,
        "retrain_trigger": total > 0 and total % 50 == 0,
        "message": "Model retraining recommended — 50+ new labels available" if (total % 50 == 0) else None
    }), 201


@app.route("/api/v1/audit/history")
def audit_history():
    """
    ---
    tags: [Audit]
    summary: Retrieve investigator decision history
    parameters:
      - in: query
        name: limit
        type: integer
        default: 50
    responses:
      200:
        description: Audit log entries
    """
    limit = request.args.get("limit", 50, type=int)
    db    = get_db()
    rows  = db.execute(
        "SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT ?", (limit,)
    ).fetchall()
    return jsonify({
        "total": db.execute("SELECT COUNT(*) FROM audit_log").fetchone()[0],
        "entries": [dict(r) for r in rows]
    }), 200


if __name__ == "__main__":
    os.chdir(BASE)
    port = int(os.environ.get("PORT", 8080))
    print(f"[GhostGuard] Starting API server on port {port}...")
    print(f"[GhostGuard] Swagger docs → http://localhost:{port}/apidocs")
    app.run(host="0.0.0.0", port=port, debug=False)