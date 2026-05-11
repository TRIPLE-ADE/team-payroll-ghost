#!/usr/bin/env python3
"""
GhostGuard — Nigerian Payroll Synthetic Data Generator
Generates 50,000 employee records following Nigerian civil service standards:
  - BVN: 11-digit number (CBN standard)
  - NIN: 11-digit number (NIMC standard)
  - Account number: 10-digit NUBAN (CBN standard)
  - Grade levels: GL-01 to GL-17 (Nigerian civil service structure)
  - MDAs: real Nigerian ministry names
  - Salaries: based on CONPSS/CONTISS salary tables
  - Injects 5,000 ghost workers (10%) with known fraud patterns
"""

import pandas as pd
import numpy as np
import hashlib
import os
import random
from faker import Faker
from datetime import datetime, timedelta

fake = Faker('en_NG')
random.seed(42)
np.random.seed(42)

# ── SALT: load from env or use default for hackathon ──────────────────────────
SALT = os.environ.get("ANON_SALT", "ghostguard-hackathon-2025-salt")

def anon(value: str) -> str:
    """One-way SHA-256 hash preserving relationship equality."""
    return hashlib.sha256(f"{SALT}{str(value)}".encode()).hexdigest()[:20]

# ── NIGERIAN CIVIL SERVICE CONSTANTS ─────────────────────────────────────────

NIGERIAN_BANKS = [
    "Access Bank", "GTBank", "Zenith Bank", "First Bank",
    "UBA", "Fidelity Bank", "FCMB", "Union Bank",
    "Sterling Bank", "Polaris Bank", "Wema Bank", "Keystone Bank"
]

MDAS = [
    "Federal Ministry of Finance", "Federal Ministry of Health",
    "Federal Ministry of Education", "Federal Ministry of Works",
    "Federal Ministry of Agriculture", "Federal Ministry of Justice",
    "Federal Ministry of Defence", "Federal Ministry of Interior",
    "Federal Ministry of Transport", "Federal Ministry of Petroleum",
    "FIRS", "NNPC", "CBN", "NCC", "NAFDAC",
    "NIMC", "INEC", "NPA", "NIMASA", "FRSC",
    "Federal Ministry of Power", "Federal Ministry of Science",
    "Federal Ministry of Water Resources", "Federal Ministry of Labour",
    "Federal Ministry of Communications", "DSS", "NIA", "EFCC", "ICPC",
    "Federal Ministry of Solid Minerals"
]

STATES = [
    "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa",
    "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo",
    "Ekiti", "Enugu", "FCT", "Gombe", "Imo", "Jigawa",
    "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara",
    "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun",
    "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
]

LGAS_BY_STATE = {
    "Lagos": ["Ikeja", "Eti-Osa", "Surulere", "Alimosho", "Kosofe"],
    "FCT":   ["Abuja Municipal", "Bwari", "Gwagwalada", "Kuje", "Abaji"],
    "Kano":  ["Kano Municipal", "Fagge", "Dala", "Gwale", "Nasarawa"],
    "Rivers": ["Port Harcourt", "Obio-Akpor", "Okrika", "Bonny", "Eleme"],
}

# Nigerian Grade Level salary ranges (CONPSS, naira/month, 2024 approximation)
GRADE_SALARY = {
    "GL-03": (35_000,  55_000),
    "GL-04": (45_000,  65_000),
    "GL-05": (55_000,  85_000),
    "GL-06": (70_000, 100_000),
    "GL-07": (90_000, 130_000),
    "GL-08": (110_000, 160_000),
    "GL-09": (140_000, 200_000),
    "GL-10": (170_000, 240_000),
    "GL-12": (220_000, 320_000),
    "GL-13": (270_000, 380_000),
    "GL-14": (330_000, 450_000),
    "GL-15": (400_000, 560_000),
    "GL-16": (500_000, 700_000),
    "GL-17": (700_000, 1_200_000),
}
GRADE_LEVELS = list(GRADE_SALARY.keys())

NIGERIAN_MALE_NAMES = [
    "Emeka", "Chukwuemeka", "Biodun", "Tunde", "Segun", "Kunle",
    "Chidi", "Obinna", "Uche", "Ikenna", "Musa", "Abdullahi",
    "Ibrahim", "Suleiman", "Yusuf", "Abubakar", "Garba", "Bello",
    "Taiwo", "Kehinde", "Adewale", "Olumide", "Rotimi", "Femi",
    "Onyeka", "Kelechi", "Chibuike", "Nnamdi", "Eze", "Okechukwu", "Abraham",
    "Mustapha", "Eniola"
]
NIGERIAN_FEMALE_NAMES = [
    "Ngozi", "Chioma", "Adaeze", "Nneka", "Ifeoma", "Amaka",
    "Fatima", "Aisha", "Hauwa", "Zainab", "Maryam", "Khadija",
    "Folake", "Funke", "Yetunde", "Bimpe", "Sade", "Toyin",
    "Blessing", "Patience", "Grace", "Faith", "Joy", "Peace",
    "Ebele", "Chinwe", "Obiageli", "Adaora", "Nkechi", "Uloma"
]
NIGERIAN_SURNAMES = [
    "Okafor", "Adeyemi", "Musa", "Ibrahim", "Abdullahi", "Okonkwo",
    "Nwosu", "Eze", "Okorie", "Chukwu", "Adebayo", "Oluwaseun",
    "Babatunde", "Adeleke", "Ogundimu", "Akinwale", "Nwachukwu",
    "Obiora", "Onyekachi", "Ugwu", "Onyema", "Aneke", "Ogbonna",
    "Agu", "Orji", "Nweke", "Okeke", "Uzoigwe", "Obi", "Egwu",
    "Balogun", "Adesanya", "Fashola", "Tinubu", "Dangote",
    "Shehu", "Usman", "Lawal", "Yakubu", "Danbaba"
]

def nigerian_name(gender=None):
    if gender is None:
        gender = random.choice(["M", "F"])
    first = random.choice(NIGERIAN_MALE_NAMES if gender == "M" else NIGERIAN_FEMALE_NAMES)
    last  = random.choice(NIGERIAN_SURNAMES)
    return f"{first} {last}", gender

def nigerian_bvn() -> str:
    """CBN standard: 11 digits starting with 2."""
    return "2" + "".join([str(random.randint(0, 9)) for _ in range(10)])

def nigerian_nin() -> str:
    """NIMC standard: 11 digits."""
    return "".join([str(random.randint(0, 9)) for _ in range(11)])

def nigerian_nuban(bank_code: str = None) -> str:
    """CBN NUBAN standard: 10-digit account number."""
    if bank_code is None:
        bank_code = str(random.randint(10, 99))
    return bank_code + "".join([str(random.randint(0, 9)) for _ in range(8)])

def random_dob(min_age=22, max_age=60) -> str:
    days_back = random.randint(min_age * 365, max_age * 365)
    dob = datetime.now() - timedelta(days=days_back)
    return dob.strftime("%Y-%m-%d")

def random_hire_date(dob_str: str) -> str:
    dob = datetime.strptime(dob_str, "%Y-%m-%d")
    earliest_hire = dob + timedelta(days=22 * 365)
    latest_hire   = datetime.now() - timedelta(days=365)
    if earliest_hire >= latest_hire:
        earliest_hire = latest_hire - timedelta(days=365)
    delta = (latest_hire - earliest_hire).days
    hire  = earliest_hire + timedelta(days=random.randint(0, delta))
    return hire.strftime("%Y-%m-%d")

def tenure_months(hire_date_str: str) -> int:
    hire = datetime.strptime(hire_date_str, "%Y-%m-%d")
    return max(1, int((datetime.now() - hire).days / 30))

# ── RECORD GENERATORS ─────────────────────────────────────────────────────────

def make_legit_employee(emp_index: int) -> dict:
    name, gender   = nigerian_name()
    dob            = random_dob()
    hire_date      = random_hire_date(dob)
    t_months       = tenure_months(hire_date)
    grade          = random.choice(GRADE_LEVELS)
    salary_min, salary_max = GRADE_SALARY[grade]
    salary         = random.randint(salary_min, salary_max)
    state          = random.choice(STATES)
    lgas           = LGAS_BY_STATE.get(state, ["LGA Central", "LGA North", "LGA South"])
    bank           = random.choice(NIGERIAN_BANKS)
    bvn            = nigerian_bvn()
    nin            = nigerian_nin()
    acct           = nigerian_nuban()
    phone          = "0" + random.choice(["7", "8", "9"]) + "".join([str(random.randint(0,9)) for _ in range(9)])
    mda            = random.choice(MDAS)

    # Realistic attendance & deductions
    avg_attendance    = random.randint(17, 23)
    months_no_deduct  = random.randint(0, min(3, t_months))
    leave_days        = random.randint(0, min(30, t_months * 2))
    promotion_count   = t_months // 36 + random.randint(0, 1)

    return {
        # Raw fields (will be anonymized before training)
        "_raw_name":        name,
        "_raw_bvn":         bvn,
        "_raw_nin":         nin,
        "_raw_acct":        acct,
        "_raw_phone":       phone,
        "_raw_dob":         dob,

        # Anonymized fields (used in model)
        "emp_id":           f"EMP{emp_index:06d}",
        "name_hash":        anon(name),
        "bvn_hash":         anon(bvn),
        "nin_hash":         anon(nin),
        "acct_hash":        anon(acct),
        "phone_hash":       anon(phone),
        "dob_hash":         anon(dob),

        # Behavioral / structural (safe to use in model directly)
        "gender":           gender,
        "grade_level":      grade,
        "grade_num":        int(grade.split("-")[1]),
        "mda":              mda,
        "state":            state,
        "lga":              random.choice(lgas),
        "bank":             bank,
        "salary":           salary,
        "hire_date":        hire_date,
        "tenure_months":    t_months,
        "avg_attendance_days": avg_attendance,
        "months_no_deduction": months_no_deduct,
        "leave_days_taken": leave_days,
        "promotion_count":  promotion_count,
        "salary_above_grade_ceiling": 0,
        "acct_shared":      0,
        "bvn_shared":       0,
        "nin_shared":       0,
        "is_ghost":         0,
        "ghost_type":       "none",
    }

def make_ghost_worker(emp_index: int, ghost_type: str,
                      shared_bvn: str = None, shared_acct: str = None) -> dict:
    """
    Ghost types:
      - shared_account   : real person, salary going to someone else's account
      - duplicate_record : same person on payroll twice (different MDA)
      - phantom          : completely fabricated employee
      - inflated_grade   : real employee but salary set above grade ceiling
      - no_show          : on payroll but never attended / no records
    """
    rec = make_legit_employee(emp_index)
    rec["is_ghost"]   = 1
    rec["ghost_type"] = ghost_type

    if ghost_type == "shared_account":
        shared = shared_acct or nigerian_nuban("00")
        rec["_raw_acct"] = shared
        rec["acct_hash"] = anon(shared)
        rec["acct_shared"] = 1
        rec["months_no_deduction"] = rec["tenure_months"]  # no deductions ever

    elif ghost_type == "duplicate_record":
        shared_b = shared_bvn or nigerian_bvn()
        rec["_raw_bvn"] = shared_b
        rec["bvn_hash"] = anon(shared_b)
        rec["bvn_shared"] = 1
        # Different MDA to avoid easy detection
        rec["mda"] = random.choice(MDAS)

    elif ghost_type == "phantom":
        # No NIN match, no attendance, no deductions
        rec["nin_hash"]           = anon("PHANTOM_" + str(emp_index))
        rec["avg_attendance_days"] = random.randint(0, 2)
        rec["months_no_deduction"] = rec["tenure_months"]
        rec["leave_days_taken"]   = 0
        rec["promotion_count"]    = 0

    elif ghost_type == "inflated_grade":
        grade_min, grade_max = GRADE_SALARY[rec["grade_level"]]
        rec["salary"] = int(grade_max * random.uniform(1.15, 1.60))
        rec["salary_above_grade_ceiling"] = 1

    elif ghost_type == "no_show":
        rec["avg_attendance_days"] = random.randint(0, 3)
        rec["months_no_deduction"] = rec["tenure_months"]
        rec["leave_days_taken"]    = 0

    return rec

# ── MAIN GENERATOR ────────────────────────────────────────────────────────────

def generate_dataset(n_legit: int = 45_000, n_ghost: int = 5_000,
                     output_path: str = "data/payroll_nigeria.csv",
                     raw_output_path: str = "data/payroll_nigeria_RAW.csv") -> pd.DataFrame:
    print(f"[GhostGuard] Generating {n_legit} legit + {n_ghost} ghost workers...")

    records = []
    idx = 0

    # ── Legit employees ───────────────────────────────────────────────────────
    for _ in range(n_legit):
        records.append(make_legit_employee(idx))
        idx += 1

    # ── Ghost workers by type ─────────────────────────────────────────────────
    ghost_split = {
        "shared_account":   int(n_ghost * 0.30),
        "duplicate_record": int(n_ghost * 0.25),
        "phantom":          int(n_ghost * 0.20),
        "inflated_grade":   int(n_ghost * 0.15),
        "no_show":          int(n_ghost * 0.10),
    }

    # Pre-generate shared BVNs and accounts for realistic clustering
    shared_bvns  = [nigerian_bvn() for _ in range(ghost_split["duplicate_record"] // 2)]
    shared_accts = [nigerian_nuban("00") for _ in range(ghost_split["shared_account"] // 2)]

    for g_type, count in ghost_split.items():
        for i in range(count):
            sbvn  = shared_bvns[i % len(shared_bvns)]  if g_type == "duplicate_record" else None
            sacct = shared_accts[i % len(shared_accts)] if g_type == "shared_account"  else None
            records.append(make_ghost_worker(idx, g_type, shared_bvn=sbvn, shared_acct=sacct))
            idx += 1

    df = pd.DataFrame(records).sample(frac=1, random_state=42).reset_index(drop=True)

    # ── Save RAW (with PII) — never used in training ──────────────────────────
    os.makedirs(os.path.dirname(raw_output_path), exist_ok=True)
    df.to_csv(raw_output_path, index=False)
    print(f"[GhostGuard] Raw dataset saved → {raw_output_path}  ({len(df)} rows)")

    # ── Save ANONYMIZED (drop all _raw_ columns) ──────────────────────────────
    anon_df = df.drop(columns=[c for c in df.columns if c.startswith("_raw_")])
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    anon_df.to_csv(output_path, index=False)
    print(f"[GhostGuard] Anonymized dataset saved → {output_path}  ({len(anon_df)} rows)")

    # ── Summary ───────────────────────────────────────────────────────────────
    print("\n── Ghost worker breakdown ──────────────────────────────")
    print(df["ghost_type"].value_counts().to_string())
    print(f"\n── Total records : {len(df)}")
    print(f"── Ghost workers : {df['is_ghost'].sum()} ({df['is_ghost'].mean()*100:.1f}%)")
    print(f"── Grade levels  : {sorted(df['grade_level'].unique())}")
    print(f"── MDAs covered  : {df['mda'].nunique()}")
    print("────────────────────────────────────────────────────────\n")

    return anon_df

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    generate_dataset()