# GhostGuard API Documentation

## Base URL

```text id="x8v2kp"
https://ghostguard-ml-179103012566.us-central1.run.app
```

```
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
```

---

# 1. Analyze Single Employee

## Endpoint

```http id="q6m1cz"
POST /api/v1/analyze/employee
```

## Request Body

```json id="n4s8tj"
{
  "emp_id": "EMP001234",
  "bvn": "22345678901",
  "nin": "12345678901",
  "account_number": "0123456789",
  "grade_level": "GL-09",
  "salary": 280000,
  "tenure_months": 36,
  "avg_attendance_days": 2,
  "months_no_deduction": 36,
  "leave_days_taken": 0,
  "promotion_count": 0
}
```

## Example Response

```json id="v2f5rd"
{
  "anomaly_detected": true,
  "anonymized_ids": {
    "acct_hash": "18df030a9dc9610ea660",
    "bvn_hash": "09eda0c56c3edd2fff10",
    "nin_hash": "fb72b645dd7b157536be"
  },
  "emp_id": "EMP001234",
  "final_score": 80.6,
  "flag_count": 3,
  "flags": [
    "Salary 40.0% above GL-9 ceiling (₦200,000)",
    "No deductions applied for entire tenure",
    "Average attendance 2.0 days/month"
  ],
  "recommended_action": "PAUSE_PAYMENT_AND_ESCALATE",
  "risk_tier": "Critical",
  "scores": {
    "anomaly": 100.0,
    "heuristic": 100,
    "ml": 51.5
  },
  "validation_warnings": []
}
```

---

# 2. Analyze Batch Employees

## Endpoint

```http id="r5c9wu"
POST /api/v1/analyze/batch
```

## Upload

Upload a CSV file using `multipart/form-data`.

Form key:

```text id="w1u7na"
file
```

## CSV Headers

```csv id="m3x8yo"
emp_id,salary,grade_level,tenure_months,bvn,nin,account_number,avg_attendance_days,months_no_deduction,leave_days_taken,promotion_count
```

## Example Response

```json id="d7q4lv"
{
  "summary": {
    "avg_score": 54.93,
    "critical": 1,
    "high": 1,
    "low": 0,
    "medium": 2,
    "total": 4
  },
  "results": [
    {
      "emp_id": "EMP001234",
      "final_score": 80.6,
      "risk_tier": "Critical",
      "recommended_action": "PAUSE_PAYMENT_AND_ESCALATE"
    }
  ]
}
```

## Example cURL

```bash id="h0v3xr"
curl -X POST http://127.0.0.1:5000/api/v1/analyze/batch \
-F "file=@employees.csv"
```

---

# 3. Detect Duplicate Employees

## Endpoint

```http id="t8m6sa"
POST /api/v1/detect/duplicates
```

## Upload

Upload CSV file using `multipart/form-data`.

Form key:

```text id="y7r1be"
file
```

## Required CSV Columns

```csv id="k4w9pz"
emp_id,bvn,nin,account_number
```

## Example Response

```json id="u3x5fn"
{
  "duplicate_pairs": 0,
  "pairs": [],
  "total_records": 4
}
```

## Duplicate Match Response Example

```json id="f9t2vm"
{
  "duplicate_pairs": 1,
  "pairs": [
    {
      "emp_id_a": "EMP001234",
      "emp_id_b": "EMP009876",
      "match_field": "BVN",
      "match_evidence": "BVN match — same identity document",
      "match_probability": 0.97,
      "recommended_action": "FREEZE_BOTH_AND_INVESTIGATE"
    }
  ],
  "total_records": 4
}
```

## Example cURL

```bash id="c6p1dk"
curl -X POST http://127.0.0.1:5000/api/v1/detect/duplicates \
-F "file=@employees.csv"
```

---

# 4. Audit Investigator Decision

## Endpoint

```http id="a1j8ry"
POST /api/v1/audit/log
```

## Request Body

```json id="g7q2mx"
{
  "emp_id": "EMP001234",
  "action": "PAUSE_PAYMENT",
  "reason": "Confirmed shared BVN with EMP005678",
  "investigator_id": "INV001",
  "final_score": 87.4,
  "risk_tier": "Critical"
}
```

## Allowed Actions

```text id="m5z4pt"
FLAG
CLEAR
ESCALATE
PAUSE_PAYMENT
REINSTATE
```

## Example Response

```json id="s2v9wn"
{
  "logged": true,
  "emp_id": "EMP001234",
  "action": "PAUSE_PAYMENT",
  "total_decisions": 12,
  "retrain_trigger": false,
  "message": null
}
```

## Example cURL

```bash id="b8f0rc"
curl -X POST http://127.0.0.1:5000/api/v1/audit/log \
-H "Content-Type: application/json" \
-d '{
  "emp_id": "EMP001234",
  "action": "PAUSE_PAYMENT",
  "reason": "Confirmed shared BVN",
  "investigator_id": "INV001"
}'
```

---

# 5. Audit History

## Endpoint

```http id="n9e2la"
GET /api/v1/audit/history
```

## Query Parameters

| Parameter | Type    | Default |
| --------- | ------- | ------- |
| limit     | integer | 50      |

## Example Request

```http id="q2m6yt"
GET /api/v1/audit/history?limit=10
```

## Example Response

```json id="z1w5ks"
{
  "total": 12,
  "entries": [
    {
      "emp_id": "EMP001234",
      "action": "PAUSE_PAYMENT",
      "reason": "Confirmed shared BVN",
      "investigator_id": "INV001",
      "risk_tier": "Critical"
    }
  ]
}
```
