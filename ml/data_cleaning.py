"""
GhostGuard — Clean Data Export
================================
Takes the raw generated data and produces:
  1. payroll_clean.csv         — full readable dataset, no hashing, proper formatting
  2. payroll_for_training.csv  — anonymized version ready for model training

Nigerian standards applied:
  - BVN:     11 digits starting with 2 (CBN)
  - NIN:     11 digits (NIMC)
  - NUBAN:   10 digits, first 3 = bank sort code prefix (CBN NUBAN spec)
  - Phone:   080/081/070/090/091 Nigerian MTN/Airtel/Glo/9mobile prefixes
  - DOB:     DD/MM/YYYY (Nigerian document standard)
  - Salary:  formatted with ₦ and commas
  - Account: bank sort code prefix embeds the bank identity
"""

import pandas as pd
import numpy as np
import hashlib
import os
import re
from pathlib import Path

BASE = Path(__file__).parent.parent
SALT = os.environ.get("ANON_SALT", "ghostguard-hackathon-2025-salt")

def anon(v):
    return hashlib.sha256(f"{SALT}{str(v)}".encode()).hexdigest()[:20]

# ── Nigerian Bank Sort Codes (CBN official) ───────────────────────────────────
# Format: Bank Name → (sort_code_prefix, bank_code_3digit)
# NUBAN account = 3-digit bank prefix + 7 random digits (CBN spec)
BANK_SORT_CODES = {
    "Access Bank":    {"sort_code": "044", "nuban_prefix": "044", "cbn_code": "044"},
    "GTBank":         {"sort_code": "058", "nuban_prefix": "058", "cbn_code": "058"},
    "Zenith Bank":    {"sort_code": "057", "nuban_prefix": "057", "cbn_code": "057"},
    "First Bank":     {"sort_code": "011", "nuban_prefix": "011", "cbn_code": "011"},
    "UBA":            {"sort_code": "033", "nuban_prefix": "033", "cbn_code": "033"},
    "Fidelity Bank":  {"sort_code": "070", "nuban_prefix": "070", "cbn_code": "070"},
    "FCMB":           {"sort_code": "214", "nuban_prefix": "214", "cbn_code": "214"},
    "Union Bank":     {"sort_code": "032", "nuban_prefix": "032", "cbn_code": "032"},
    "Sterling Bank":  {"sort_code": "232", "nuban_prefix": "232", "cbn_code": "232"},
    "Polaris Bank":   {"sort_code": "076", "nuban_prefix": "076", "cbn_code": "076"},
    "Wema Bank":      {"sort_code": "035", "nuban_prefix": "035", "cbn_code": "035"},
    "Keystone Bank":  {"sort_code": "082", "nuban_prefix": "082", "cbn_code": "082"},
}

# Nigerian phone prefixes by network (NCC standard)
PHONE_PREFIXES = {
    "MTN":      ["0803", "0806", "0703", "0706", "0813", "0816", "0810", "0814"],
    "Airtel":   ["0802", "0808", "0708", "0812"],
    "Glo":      ["0805", "0807", "0705", "0815"],
    "9mobile":  ["0809", "0818", "0817", "0908", "0909"],
}
ALL_PREFIXES = [p for nets in PHONE_PREFIXES.values() for p in nets]

# Grade level → CONPSS step descriptions
GRADE_DESCRIPTIONS = {
    "GL-03": "Junior Staff / Cleaner / Driver",
    "GL-04": "Junior Officer / Typist",
    "GL-05": "Officer II",
    "GL-06": "Officer I",
    "GL-07": "Higher Officer / Executive Officer",
    "GL-08": "Senior Officer",
    "GL-09": "Principal Officer",
    "GL-10": "Chief Officer",
    "GL-12": "Assistant Director",
    "GL-13": "Deputy Director",
    "GL-14": "Director",
    "GL-15": "Director (Senior)",
    "GL-16": "Permanent Secretary / DG equivalent",
    "GL-17": "Accounting Officer / Minister equivalent",
}

GRADE_SALARY_CEILING = {
    "GL-03": 55_000,   "GL-04": 65_000,   "GL-05": 85_000,
    "GL-06": 100_000,  "GL-07": 130_000,  "GL-08": 160_000,
    "GL-09": 200_000,  "GL-10": 240_000,  "GL-12": 320_000,
    "GL-13": 380_000,  "GL-14": 450_000,  "GL-15": 560_000,
    "GL-16": 700_000,  "GL-17": 1_200_000,
}


def fix_bvn(raw_bvn) -> str:
    """
    Ensure BVN is exactly 11 digits starting with 2.
    CBN spec: BVN starts with '2', total 11 digits.
    """
    s = str(int(float(str(raw_bvn))))
    if len(s) < 11:
        s = "2" + s.zfill(10)
    return s[:11]


def fix_nin(raw_nin) -> str:
    """
    Ensure NIN is exactly 11 digits.
    NIMC spec: 11 numeric digits.
    """
    s = str(int(float(str(raw_nin))))
    return s.zfill(11)[:11]


def build_nuban(bank_name: str, seed: int) -> str:
    """
    Build a NUBAN-compliant 10-digit account number.
    CBN NUBAN format: [3-digit bank code][7-digit serial]
    The first 3 digits identify the bank — this is the key mapping.

    Real NUBAN algorithm also uses a checksum (mod 10 with weights 3,7,3...),
    but for synthetic data we embed the bank code so the mapping is readable.
    """
    bank_info = BANK_SORT_CODES.get(bank_name, {"nuban_prefix": "999"})
    prefix    = bank_info["nuban_prefix"]
    # 7-digit serial derived from seed for reproducibility
    np.random.seed(seed % 2**31)
    serial = "".join([str(np.random.randint(0, 10)) for _ in range(7)])
    return prefix + serial


def fix_phone(raw_phone) -> str:
    """
    Format as Nigerian mobile number: 080XXXXXXXX (11 digits, starts with 0).
    NCC standard: 0 + network prefix (3 digits) + 7 digits = 11 total.
    """
    s = str(raw_phone).strip()
    # Strip leading zero or country code if present
    s = re.sub(r"^(\+?234|0)", "", s)
    s = s.zfill(10)[:10]
    # Pick a real Nigerian prefix
    prefix = ALL_PREFIXES[int(s[:2]) % len(ALL_PREFIXES)]
    return prefix + s[4:].zfill(7)[:7]


def format_dob(raw_dob: str) -> str:
    """Convert YYYY-MM-DD to DD/MM/YYYY (Nigerian document standard)."""
    try:
        parts = str(raw_dob).split("-")
        if len(parts) == 3:
            return f"{parts[2]}/{parts[1]}/{parts[0]}"
    except Exception:
        pass
    return str(raw_dob)


def format_salary(amount: float) -> str:
    """Format as ₦280,000.00"""
    return f"₦{amount:,.2f}"


def build_clean_dataset(
    raw_path: str = "data/payroll_nigeria_RAW.csv",
    clean_path: str = "data/payroll_clean.csv",
    training_path: str = "data/payroll_for_training.csv",
) -> pd.DataFrame:

    print("[GhostGuard] Loading raw dataset...")
    df = pd.read_csv(raw_path)
    print(f"             {len(df):,} records loaded")

    clean = pd.DataFrame()

    # ── Identity columns ──────────────────────────────────────────────────────
    clean["employee_id"]    = df["emp_id"]
    clean["full_name"]      = df["_raw_name"]
    clean["gender"]         = df["gender"].map({"M": "Male", "F": "Female"})

    # BVN — 11 digits, starts with 2 (CBN standard)
    clean["bvn"]            = df["_raw_bvn"].apply(fix_bvn)

    # NIN — 11 digits (NIMC standard)
    clean["nin"]            = df["_raw_nin"].apply(fix_nin)

    # Date of birth — DD/MM/YYYY
    clean["date_of_birth"]  = df["_raw_dob"].apply(format_dob)

    # Phone — 11-digit Nigerian mobile (NCC standard)
    clean["phone_number"]   = df["_raw_phone"].apply(fix_phone)

    # ── Bank & account (NUBAN mapped to bank) ─────────────────────────────────
    clean["bank_name"]      = df["bank"]
    clean["bank_sort_code"] = df["bank"].map(
        lambda b: BANK_SORT_CODES.get(b, {}).get("sort_code", "999")
    )

    # Rebuild NUBAN with correct bank prefix embedded
    clean["account_number"] = [
        build_nuban(row["bank"], i)
        for i, row in df[["bank"]].iterrows()
    ]

    # Verify: account starts with bank's 3-digit code
    clean["account_bank_match"] = (
        clean["account_number"].str[:3] == clean["bank_sort_code"]
    )

    # ── Employment details ────────────────────────────────────────────────────
    clean["grade_level"]        = df["grade_level"]
    clean["grade_description"]  = df["grade_level"].map(GRADE_DESCRIPTIONS)
    clean["mda"]                = df["mda"]
    clean["state"]              = df["state"]
    clean["lga"]                = df["lga"]
    clean["hire_date"]          = pd.to_datetime(df["hire_date"]).dt.strftime("%d/%m/%Y")
    clean["tenure_months"]      = df["tenure_months"]

    # ── Salary ────────────────────────────────────────────────────────────────
    clean["salary_naira"]       = df["salary"]
    clean["salary_formatted"]   = df["salary"].apply(format_salary)
    clean["grade_ceiling_naira"]= df["grade_level"].map(GRADE_SALARY_CEILING)
    clean["salary_within_grade"]= clean["salary_naira"] <= clean["grade_ceiling_naira"]

    # ── Attendance & conduct ──────────────────────────────────────────────────
    clean["avg_attendance_days_per_month"] = df["avg_attendance_days"]
    clean["months_no_deduction"]           = df["months_no_deduction"]
    clean["leave_days_taken"]              = df["leave_days_taken"]
    clean["promotion_count"]               = df["promotion_count"]

    # ── Ground truth (for training/evaluation) ────────────────────────────────
    clean["is_ghost"]   = df["is_ghost"]
    clean["ghost_type"] = df["ghost_type"]

    # ── Save clean CSV ────────────────────────────────────────────────────────
    clean.to_csv(clean_path, index=False)
    print(f"\n[Output] Clean dataset → {clean_path}")
    print(f"         {len(clean):,} rows × {len(clean.columns)} columns")

    # ── Build anonymized training version ────────────────────────────────────
    training = clean.copy()
    pii_cols = ["full_name", "bvn", "nin", "date_of_birth",
                "phone_number", "account_number"]
    for col in pii_cols:
        training[col + "_hash"] = training[col].astype(str).apply(anon)
        training.drop(columns=[col], inplace=True)

    # Add cross-record shared-identity flags (critical for heuristics)
    for hash_col in ["bvn_hash", "nin_hash", "account_number_hash"]:
        counts = training.groupby(hash_col)["employee_id"].transform("count")
        flag_col = hash_col.replace("_hash", "_shared")
        training[flag_col] = (counts > 1).astype(int)

    training.to_csv(training_path, index=False)
    print(f"[Output] Training dataset → {training_path}")
    print(f"         {len(training):,} rows × {len(training.columns)} columns")

    # ── Summary stats ─────────────────────────────────────────────────────────
    print("\n── Dataset summary ─────────────────────────────────────────────")
    print(f"  Total employees      : {len(clean):,}")
    print(f"  Ghost workers        : {clean['is_ghost'].sum():,} ({clean['is_ghost'].mean()*100:.1f}%)")
    print(f"\n  Ghost types:")
    for t, c in clean["ghost_type"].value_counts().items():
        print(f"    {t:<22} : {c:,}")
    print(f"\n  Salary within grade  : {clean['salary_within_grade'].sum():,} / {len(clean):,}")
    print(f"  Account-bank matched : {clean['account_bank_match'].sum():,} / {len(clean):,}")
    print(f"\n  Banks represented:")
    for bank, cnt in clean["bank_name"].value_counts().items():
        code = BANK_SORT_CODES.get(bank, {}).get("sort_code", "???")
        print(f"    [{code}] {bank:<20} : {cnt:,} accounts")
    print("────────────────────────────────────────────────────────────────")

    return clean


if __name__ == "__main__":
    os.chdir(BASE)
    df = build_clean_dataset()

    # Quick spot-check: print 5 ghost workers nicely
    print("\n── Sample ghost workers (readable) ────────────────────────────")
    sample = df[df["is_ghost"] == 1][[
        "employee_id", "full_name", "bvn", "nin",
        "bank_name", "bank_sort_code", "account_number",
        "grade_level", "salary_formatted", "ghost_type"
    ]].head(5)
    for _, r in sample.iterrows():
        print(f"\n  {r['employee_id']} | {r['full_name']}")
        print(f"  BVN: {r['bvn']}  NIN: {r['nin']}")
        print(f"  Bank: {r['bank_name']} [{r['bank_sort_code']}]  Acct: {r['account_number']}")
        print(f"  Grade: {r['grade_level']}  Salary: {r['salary_formatted']}")
        print(f"  Ghost type: {r['ghost_type']}")

    # Quick spot-check: verify NUBAN prefix = bank sort code
    print("\n── NUBAN bank mapping verification ────────────────────────────")
    sample2 = df.groupby("bank_name").first()[["bank_sort_code", "account_number"]].reset_index()
    for _, r in sample2.iterrows():
        prefix_match = r["account_number"][:3] == r["bank_sort_code"]
        status = "✓" if prefix_match else "✗"
        print(f"  {status} {r['bank_name']:<20} code={r['bank_sort_code']}  acct={r['account_number']}")