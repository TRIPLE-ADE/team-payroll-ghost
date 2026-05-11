#!/usr/bin/env python3
"""
GhostGuard — Model Training Pipeline
Three-layer detection system:
  1. Heuristic rules         — deterministic flags, instant, no training
  2. Isolation Forest        — unsupervised anomaly detection, no labels needed
  3. XGBoost classifier      — supervised scoring, uses heuristic labels to bootstrap

Plus:
  4. Splink record linkage   — duplicate person detection (same person, two records)

All models are saved to /models/ and loaded by the Flask API.
"""

import pandas as pd
import numpy as np
import joblib
import os
import json
from pathlib import Path

from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import (classification_report, roc_auc_score,
                              confusion_matrix)
import xgboost as xgb

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE      = Path(__file__).parent.parent
DATA_PATH = BASE / "data" / "payroll_nigeria.csv"
MODEL_DIR = BASE / "models"
MODEL_DIR.mkdir(exist_ok=True)

# ── Grade ceiling map (naira/month) ──────────────────────────────────────────
GRADE_CEILING = {
    3:  55_000,   4:  65_000,   5:  85_000,
    6: 100_000,   7: 130_000,   8: 160_000,
    9: 200_000,  10: 240_000,  12: 320_000,
    13: 380_000, 14: 450_000,  15: 560_000,
    16: 700_000, 17: 1_200_000
}

FEATURE_COLS = [
    "salary", "grade_num", "tenure_months",
    "avg_attendance_days", "months_no_deduction",
    "leave_days_taken", "promotion_count",
    "salary_above_grade_ceiling", "acct_shared",
    "bvn_shared", "nin_shared",
]

# ══════════════════════════════════════════════════════════════════════════════
# LAYER 1 — HEURISTIC RULES
# ══════════════════════════════════════════════════════════════════════════════

def apply_heuristics(df: pd.DataFrame) -> pd.DataFrame:
    """
    Deterministic rule engine. Returns df with:
      - heuristic_score   (0–100)
      - heuristic_flags   (list of triggered rule names)
    """
    df = df.copy()
    df["heuristic_score"] = 0.0
    df["heuristic_flags"] = [[] for _ in range(len(df))]

    def add_flag(mask, rule_name, points):
        df.loc[mask, "heuristic_score"] += points
        for i in df[mask].index:
            df.at[i, "heuristic_flags"].append(rule_name)

    # R1 — Same bank account on multiple salary records
    acct_counts = df.groupby("acct_hash")["emp_id"].transform("count")
    add_flag(acct_counts > 1,
             "Shared bank account (multiple employees)", 80)

    # R2 — Same BVN on multiple records
    bvn_counts = df.groupby("bvn_hash")["emp_id"].transform("count")
    add_flag(bvn_counts > 1,
             "Shared BVN (duplicate identity)", 75)

    # R3 — Same NIN on multiple records
    nin_counts = df.groupby("nin_hash")["emp_id"].transform("count")
    add_flag(nin_counts > 1,
             "Shared NIN (duplicate identity)", 75)

    # R4 — Salary above grade level ceiling (>5% tolerance)
    grade_ceil = df["grade_num"].map(GRADE_CEILING).fillna(999_999)
    add_flag(df["salary"] > grade_ceil * 1.05,
             "Salary exceeds grade level ceiling by >5%", 70)

    # R5 — Zero attendance for 12+ months on payroll
    add_flag(
        (df["avg_attendance_days"] == 0) & (df["tenure_months"] >= 12),
        "Zero attendance recorded for 12+ months", 65
    )

    # R6 — Zero deductions for entire tenure
    add_flag(
        df["months_no_deduction"] == df["tenure_months"],
        "No deductions for entire employment tenure", 55
    )

    # R7 — No leave taken in 3+ years
    add_flag(
        (df["leave_days_taken"] == 0) & (df["tenure_months"] > 36),
        "No leave taken in 3+ years of service", 45
    )

    # R8 — Very low attendance (< 5 days/month average) but still paid
    add_flag(
        (df["avg_attendance_days"] < 5) & (df["tenure_months"] >= 6),
        "Average attendance below 5 days/month", 40
    )

    # R9 — No promotions after 5+ years
    add_flag(
        (df["promotion_count"] == 0) & (df["tenure_months"] > 60),
        "No promotion in 5+ years of service", 25
    )

    df["heuristic_score"] = df["heuristic_score"].clip(0, 100)
    return df


# ══════════════════════════════════════════════════════════════════════════════
# LAYER 2 — ISOLATION FOREST (unsupervised anomaly detection)
# ══════════════════════════════════════════════════════════════════════════════

def train_isolation_forest(df: pd.DataFrame):
    print("\n[Layer 2] Training Isolation Forest...")

    X = df[FEATURE_COLS].fillna(0).values

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    iso = IsolationForest(
        n_estimators=300,
        contamination=0.10,      # we know ~10% are ghost
        max_samples="auto",
        random_state=42,
        n_jobs=-1
    )
    iso.fit(X_scaled)

    raw_scores = iso.score_samples(X_scaled)        # more negative = worse
    norm_scores = MinMaxScaler().fit_transform(
        (-raw_scores).reshape(-1, 1)
    ).flatten() * 100                               # 0–100, higher = suspicious

    df = df.copy()
    df["anomaly_flag"]  = iso.predict(X_scaled)    # -1=anomaly, 1=normal
    df["anomaly_score"] = np.round(norm_scores, 2)

    # Evaluate against known labels
    y_true = df["is_ghost"].values
    y_pred = (df["anomaly_flag"] == -1).astype(int)
    print(f"   Isolation Forest — AUC proxy:")
    print(f"   Flagged as anomaly : {y_pred.sum()} records")
    print(f"   True ghosts caught : {((y_pred==1)&(y_true==1)).sum()} / {y_true.sum()}")
    print(f"   False positives    : {((y_pred==1)&(y_true==0)).sum()}")

    joblib.dump(iso,    MODEL_DIR / "isolation_forest.pkl")
    joblib.dump(scaler, MODEL_DIR / "iso_scaler.pkl")
    print(f"   Saved → models/isolation_forest.pkl")

    return df, iso, scaler


# ══════════════════════════════════════════════════════════════════════════════
# LAYER 3 — XGBOOST CLASSIFIER (supervised)
# ══════════════════════════════════════════════════════════════════════════════

def train_xgboost(df: pd.DataFrame):
    print("\n[Layer 3] Training XGBoost classifier...")

    # Bootstrap labels: use heuristic score >= 50 as weak positive label
    # In production, replace with investigator-confirmed labels
    df = df.copy()
    df["weak_label"] = (df["heuristic_score"] >= 50).astype(int)

    # Also add anomaly score as a feature
    feature_cols_xgb = FEATURE_COLS + ["heuristic_score", "anomaly_score"]
    X = df[feature_cols_xgb].fillna(0)
    y = df["is_ghost"]          # use ground truth for training (synthetic data)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    # Class imbalance: 45000 legit : 5000 ghost = 9:1
    scale_pos_weight = (y_train == 0).sum() / max((y_train == 1).sum(), 1)

    model = xgb.XGBClassifier(
        n_estimators=400,
        max_depth=5,
        learning_rate=0.03,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=scale_pos_weight,
        eval_metric="auc",
        early_stopping_rounds=30,
        random_state=42,
        n_jobs=-1,
        verbosity=0
    )
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False
    )

    y_prob = model.predict_proba(X_test)[:, 1]
    y_pred = model.predict(X_test)

    auc = roc_auc_score(y_test, y_prob)
    print(f"   XGBoost AUC  : {auc:.4f}")
    print(f"   Best round   : {model.best_iteration}")
    print("\n   Classification Report (test set):")
    print(classification_report(y_test, y_pred,
          target_names=["Legit", "Ghost"]))

    # Feature importance
    fi = pd.Series(model.feature_importances_,
                   index=feature_cols_xgb).sort_values(ascending=False)
    print("   Top features:")
    print(fi.head(8).to_string())

    # Score all records
    df["ml_score"] = np.round(
        model.predict_proba(df[feature_cols_xgb].fillna(0))[:, 1] * 100, 2
    )

    joblib.dump(model, MODEL_DIR / "xgboost_ghost.pkl")
    joblib.dump(feature_cols_xgb, MODEL_DIR / "xgb_features.pkl")
    print(f"\n   Saved → models/xgboost_ghost.pkl")

    return df, model, auc


# ══════════════════════════════════════════════════════════════════════════════
# COMPOSITE SCORE
# ══════════════════════════════════════════════════════════════════════════════

def compute_final_score(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["final_score"] = (
        df["heuristic_score"] * 0.35 +
        df["anomaly_score"]   * 0.25 +
        df["ml_score"]        * 0.40
    ).clip(0, 100).round(2)

    df["risk_tier"] = pd.cut(
        df["final_score"],
        bins=[-0.1, 30, 60, 80, 100],
        labels=["Low", "Medium", "High", "Critical"]
    )
    return df


# ══════════════════════════════════════════════════════════════════════════════
# LAYER 4 — SPLINK: DUPLICATE PERSON DETECTION
# ══════════════════════════════════════════════════════════════════════════════

def train_duplicate_detector(df: pd.DataFrame):
    print("\n[Layer 4] Running Splink duplicate person detection...")
    try:
        import splink.comparison_library as cl
        from splink import DuckDBAPI, Linker, SettingsCreator

        # Splink needs an 'unique_id' column
        splink_df = df[["emp_id","name_hash","dob_hash",
                         "bvn_hash","nin_hash","acct_hash","phone_hash"]].copy()
        splink_df = splink_df.rename(columns={"emp_id": "unique_id"})

        settings = SettingsCreator(
            link_type="dedupe_only",
            comparisons=[
                cl.ExactMatch("bvn_hash").configure(
                    term_frequency_adjustments=False),
                cl.ExactMatch("nin_hash").configure(
                    term_frequency_adjustments=False),
                cl.ExactMatch("acct_hash").configure(
                    term_frequency_adjustments=False),
                cl.ExactMatch("dob_hash"),
                cl.ExactMatch("name_hash"),
            ],
            blocking_rules_to_generate_predictions=[
                "l.bvn_hash = r.bvn_hash",
                "l.nin_hash = r.nin_hash",
                "l.acct_hash = r.acct_hash",
                "l.dob_hash = r.dob_hash",
            ],
            em_convergence=0.001,
            max_iterations=10
        )

        linker = Linker(splink_df, settings, db_api=DuckDBAPI())
        linker.estimate_u_using_random_sampling(max_pairs=500_000)

        try:
            linker.estimate_parameters_using_expectation_maximisation(
                "l.bvn_hash = r.bvn_hash"
            )
        except Exception:
            pass

        pairs = linker.predict(threshold_match_probability=0.80)
        pairs_df = pairs.as_pandas_dataframe()

        out_path = BASE / "data" / "duplicate_pairs.csv"
        pairs_df.to_csv(out_path, index=False)

        print(f"   Duplicate pairs found : {len(pairs_df)}")
        print(f"   Saved → data/duplicate_pairs.csv")
        return pairs_df

    except Exception as e:
        print(f"   Splink error: {e}")
        # Fallback: simple exact-match duplicate detection
        print("   Falling back to exact-match duplicate detection...")
        dups = []
        for col in ["bvn_hash", "nin_hash", "acct_hash"]:
            grp = df[df[col].duplicated(keep=False)].groupby(col)["emp_id"].apply(list)
            for key, ids in grp.items():
                for i in range(len(ids)):
                    for j in range(i + 1, len(ids)):
                        dups.append({
                            "unique_id_l":          ids[i],
                            "unique_id_r":          ids[j],
                            "match_field":          col,
                            "match_probability":    0.95
                        })
        pairs_df = pd.DataFrame(dups).drop_duplicates(
            subset=["unique_id_l", "unique_id_r"])
        out_path = BASE / "data" / "duplicate_pairs.csv"
        pairs_df.to_csv(out_path, index=False)
        print(f"   Duplicate pairs found : {len(pairs_df)}")
        print(f"   Saved → data/duplicate_pairs.csv")
        return pairs_df


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

def train_all():
    print("=" * 60)
    print("  GhostGuard — Full Model Training Pipeline")
    print("=" * 60)

    # Load anonymized dataset
    print(f"\n[Data] Loading {DATA_PATH}...")
    df = pd.read_csv(DATA_PATH)
    print(f"       {len(df)} records loaded")

    # Layer 1 — Heuristics
    print("\n[Layer 1] Applying heuristic rules...")
    df = apply_heuristics(df)
    h_flagged = (df["heuristic_score"] >= 50).sum()
    print(f"   Heuristic flags >= 50 : {h_flagged} records")
    print(f"   Recall on known ghosts: "
          f"{((df['heuristic_score']>=50)&(df['is_ghost']==1)).sum()} / {df['is_ghost'].sum()}")

    # Layer 2 — Isolation Forest
    df, iso_model, scaler = train_isolation_forest(df)

    # Layer 3 — XGBoost
    df, xgb_model, auc = train_xgboost(df)

    # Composite score
    df = compute_final_score(df)

    # Save scored dataset (no raw PII)
    scored_cols = [c for c in df.columns if not c.startswith("_raw_")]
    scored_path = BASE / "data" / "payroll_scored.csv"
    df[scored_cols].to_csv(scored_path, index=False)
    print(f"\n[Output] Scored dataset saved → {scored_path}")

    # Layer 4 — Duplicate detection
    dup_df = train_duplicate_detector(df)

    # Save model metadata
    meta = {
        "xgboost_auc":       round(auc, 4),
        "total_records":     len(df),
        "ghost_records":     int(df["is_ghost"].sum()),
        "ghost_rate":        round(df["is_ghost"].mean() * 100, 2),
        "critical_flagged":  int((df["risk_tier"] == "Critical").sum()),
        "high_flagged":      int((df["risk_tier"] == "High").sum()),
        "duplicate_pairs":   len(dup_df),
        "feature_cols":      FEATURE_COLS,
        "grade_ceiling":     GRADE_CEILING,
        "trained_at":        pd.Timestamp.now().isoformat()
    }
    with open(MODEL_DIR / "metadata.json", "w") as f:
        json.dump(meta, f, indent=2)

    print("\n" + "=" * 60)
    print("  Training Complete")
    print("=" * 60)
    print(f"  XGBoost AUC     : {auc:.4f}")
    print(f"  Critical flags  : {meta['critical_flagged']}")
    print(f"  High flags      : {meta['high_flagged']}")
    print(f"  Duplicate pairs : {meta['duplicate_pairs']}")
    print("=" * 60)

    return df


if __name__ == "__main__":
    os.chdir(BASE)
    train_all()