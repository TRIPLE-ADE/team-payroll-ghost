# GhostBuster Backend — Testing Guide

This guide walks through testing every part of the backend, from startup to a complete end-to-end payroll run.

---

## Prerequisites

### 1. Environment file

Create `backend/.env` from the example:

```bash
cp backend/.env.example backend/.env
```

Fill in at minimum:

```env
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/ghostbuster
ML_SERVICE_URL=http://localhost:5000
SQUAD_API_KEY=your_sandbox_key
SQUAD_SECRET_KEY=your_sandbox_secret
SQUAD_MERCHANT_ID=GHOSTBUSTER
JWT_SECRET=any-long-random-string-32-chars-min
ADMIN_EMAIL=admin@ghostbuster.io
ADMIN_PASSWORD=changeme123
```

### 2. Start PostgreSQL

```bash
# Using Docker:
docker run -d \
  --name ghostbuster-db \
  -e POSTGRES_DB=ghostbuster \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:15

# Or use any existing Postgres instance — just update DATABASE_URL
```

### 3. Install dependencies and run

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Tables are auto-created on startup. You should see:

```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Application startup complete.
```

---

## Test 1 — Health Check

Confirm the server is running.

```bash
curl http://localhost:8000/health
```

Expected:
```json
{"status": "ok", "service": "ghostbuster-backend"}
```

---

## Test 2 — Authentication

### 2a. Login

```bash
curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@ghostbuster.io", "password": "changeme123"}' | jq
```

Expected:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

Save the token for all subsequent requests:

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@ghostbuster.io", "password": "changeme123"}' | jq -r '.access_token')

echo $TOKEN
```

### 2b. Wrong credentials

```bash
curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "wrong@email.com", "password": "wrong"}' | jq
```

Expected:
```json
{"detail": "Invalid credentials"}
```

### 2c. Unauthenticated request

```bash
curl -s http://localhost:8000/api/v1/investigations | jq
```

Expected:
```json
{"detail": "Not authenticated"}
```

---

## Test 3 — Payroll Upload

### 3a. Create sample CSV

Save this as `test_payroll.csv`:

```csv
emp_id,name,salary,grade_level,tenure_months,department,role,bvn,nin,account_number,bank_code,avg_attendance_days,months_no_deduction,leave_days_taken,promotion_count
EMP001,Alice Johnson,450000,GL-07,36,Finance Ops,Senior Accountant,12345678901,98765432100,0123456789,000013,22,0,5,1
EMP002,Bob Okafor,380000,GL-05,18,HR,HR Officer,12345678902,98765432101,0123456790,000013,20,0,10,0
EMP003,Charlie Eze,520000,GL-08,60,Finance Ops,Manager,12345678903,98765432102,0123456791,000058,21,0,8,2
EMP004,Diana Musa,300000,GL-04,6,ICT,Analyst,12345678904,98765432103,0123456792,000016,19,3,0,0
EMP005,Eve Adeyemi,450000,GL-07,36,Finance Ops,Accountant,12345678901,98765432100,0123456789,000013,0,6,0,0
```

> Note: EMP001 and EMP005 share the same `bvn`, `nin`, and `account_number` — this should be detected as a duplicate by the ML service.
> EMP004 has 3 `months_no_deduction` and 0 leave — potential anomaly signal.
> EMP005 has 0 attendance and 6 months no deduction — high risk signal.

### 3b. Upload the CSV

```bash
CYCLE_ID=$(curl -s -X POST http://localhost:8000/api/v1/payroll/cycles \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test_payroll.csv" | jq -r '.id')

echo "Cycle ID: $CYCLE_ID"
```

Expected:
```json
{ "id": "550e8400-e29b-41d4-a716-446655440000" }
```

### 3c. Confirm cycle was created

```bash
curl -s http://localhost:8000/api/v1/payroll/cycles \
  -H "Authorization: Bearer $TOKEN" | jq
```

Expected: cycle with `processingStatus: "uploaded"`, `totalEmployees: 5`.

### 3d. Test bad CSV (missing columns)

```bash
echo "emp_id,name" > bad.csv
echo "EMP001,Alice" >> bad.csv

curl -s -X POST http://localhost:8000/api/v1/payroll/cycles \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@bad.csv" | jq
```

Expected:
```json
{ "detail": "Missing CSV columns: {'salary', 'grade_level', 'tenure_months'}" }
```

---

## Test 4 — ML Analysis

### 4a. Trigger analysis

> Make sure the ML service is running on `ML_SERVICE_URL` before this step.
> If you don't have the ML service, skip to **Mock mode** below.

```bash
curl -s -X POST http://localhost:8000/api/v1/payroll/cycles/$CYCLE_ID/analyze \
  -H "Authorization: Bearer $TOKEN" | jq
```

Expected:
```json
{ "ok": true, "message": "Analysis started" }
```

### 4b. Poll until analysis completes

The analysis runs in background. Poll every 2 seconds:

```bash
while true; do
  STATUS=$(curl -s http://localhost:8000/api/v1/payroll/cycles/$CYCLE_ID \
    -H "Authorization: Bearer $TOKEN" | jq -r '.processingStatus')
  echo "Status: $STATUS"
  if [ "$STATUS" = "ready" ]; then break; fi
  sleep 2
done
```

### 4c. Check analysis results

```bash
curl -s http://localhost:8000/api/v1/payroll/cycles/$CYCLE_ID \
  -H "Authorization: Bearer $TOKEN" | jq '{
    processingStatus: .processingStatus,
    integrityScore: .integrityScore,
    flaggedCount: .flaggedCount,
    flaggedRows: [.flaggedRows[] | {employeeId, severity, anomalyLabels, investigationId}]
  }'
```

Expected (with ML service running): flaggedRows populated, `processingStatus: "ready"`.

### 4d. Cannot trigger analysis twice

```bash
curl -s -X POST http://localhost:8000/api/v1/payroll/cycles/$CYCLE_ID/analyze \
  -H "Authorization: Bearer $TOKEN" | jq
```

Expected:
```json
{ "detail": "Analysis can only start from 'uploaded' status (current: ready)" }
```

---

## Test 5 — Mock mode (no ML service)

If the ML service is unavailable, the background task will catch the error and mark the cycle as `ready` with no flagged rows. To test investigations manually:

```bash
# Use the Swagger UI to manually create test data
open http://localhost:8000/docs
```

Or seed directly with a script if needed. The core investigation workflow still works — just no auto-flagging.

---

## Test 6 — Investigations

### 6a. List investigations

```bash
curl -s http://localhost:8000/api/v1/investigations \
  -H "Authorization: Bearer $TOKEN" | jq '[.[] | {id, employeeId, status}]'
```

### 6b. Filter by status

```bash
curl -s "http://localhost:8000/api/v1/investigations?status=open" \
  -H "Authorization: Bearer $TOKEN" | jq length
```

### 6c. Get investigation detail

```bash
INV_ID=$(curl -s http://localhost:8000/api/v1/investigations \
  -H "Authorization: Bearer $TOKEN" | jq -r '.[0].id')

curl -s http://localhost:8000/api/v1/investigations/$INV_ID \
  -H "Authorization: Bearer $TOKEN" | jq '{
    status: .investigation.status,
    employeeId: .investigation.employeeId,
    factors: [.investigation.explainableFactors[] | .title],
    trustScore: .employee.trustScore,
    peerAvg: .employee.peerGroupAvgTrust
  }'
```

---

## Test 7 — Investigation Actions

Run these in sequence on the same `$INV_ID`:

### 7a. Pause payment

```bash
curl -s -X POST http://localhost:8000/api/v1/investigations/$INV_ID/actions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "pause_payment"}' | jq
```

Expected: `{ "ok": true, "message": "Action recorded" }`

Verify: re-fetch the cycle — that employee's `paymentStatus` should be `"paused"`.

### 7b. Escalate

```bash
curl -s -X POST http://localhost:8000/api/v1/investigations/$INV_ID/actions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "escalate"}' | jq
```

Expected: `{ "ok": true, "message": "Action recorded" }`

Verify: `GET /investigations/$INV_ID` — `status` should be `"escalated"`.

### 7c. Request verification

```bash
curl -s -X POST http://localhost:8000/api/v1/investigations/$INV_ID/actions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "request_verification"}' | jq
```

Expected: `{ "ok": true, "message": "Action recorded" }`

### 7d. Approve payment (triggers Squad)

> Requires `SQUAD_API_KEY` and the employee to have `account_number` + `bank_code` populated.

```bash
curl -s -X POST http://localhost:8000/api/v1/investigations/$INV_ID/actions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "approve_payment"}' | jq
```

Expected (Squad sandbox, valid BVN):
```json
{ "ok": true, "message": "Action recorded" }
```

Expected (BVN mismatch):
```json
{ "ok": false, "message": "BVN mismatch: Name does not match Central Bank records" }
```

After approval, verify:
```bash
curl -s http://localhost:8000/api/v1/payments/interventions \
  -H "Authorization: Bearer $TOKEN" | jq '[.[] | {employeeId, state, squadRef}]'
```

The approved payment should have `state: "released"` and a `squadRef`.

---

## Test 8 — Dashboard Endpoints

```bash
# Overview
curl -s http://localhost:8000/api/v1/integrity/overview \
  -H "Authorization: Bearer $TOKEN" | jq

# Threat feed
curl -s http://localhost:8000/api/v1/threat-feed \
  -H "Authorization: Bearer $TOKEN" | jq length

# Department risk
curl -s http://localhost:8000/api/v1/departments/risk \
  -H "Authorization: Bearer $TOKEN" | jq

# Trends
curl -s http://localhost:8000/api/v1/trends/integrity \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## Test 9 — Employee Directory

```bash
curl -s http://localhost:8000/api/v1/employees/directory \
  -H "Authorization: Bearer $TOKEN" | jq '[.[] | {id, name, trustScore, riskLevel}]'
```

Check:
- Employees flagged by ML have lower `trustScore`
- `riskLevel` is `"high"` for trust < 55, `"medium"` for 55–74, `"low"` for ≥ 75

---

## Test 10 — Relationship Graph

```bash
# Full graph
curl -s http://localhost:8000/api/v1/relationships/graph \
  -H "Authorization: Bearer $TOKEN" | jq '{nodeCount: (.nodes | length), edgeCount: (.edges | length)}'

# 1-hop context for an employee
curl -s http://localhost:8000/api/v1/relationships/context/EMP001 \
  -H "Authorization: Bearer $TOKEN" | jq
```

If duplicates were detected, you should see cluster nodes and edges connecting EMP001 and EMP005.

---

## Test 11 — Audit Events

```bash
curl -s http://localhost:8000/api/v1/audit/events \
  -H "Authorization: Bearer $TOKEN" | jq '[.[] | {type, title, actor}]'
```

You should see events for:
- `payroll_upload` — from the CSV upload
- `anomaly` — from analysis completion
- `intervention` — from pause/approve/escalate actions
- `verification` — from request_verification actions

---

## Test 12 — Settings

```bash
# Get settings
curl -s http://localhost:8000/api/v1/settings \
  -H "Authorization: Bearer $TOKEN" | jq

# Update settings
curl -s -X PUT http://localhost:8000/api/v1/settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"institutionName": "Federal Ministry of Finance", "anomalySensitivity": "high"}' | jq

# Confirm update
curl -s http://localhost:8000/api/v1/settings \
  -H "Authorization: Bearer $TOKEN" | jq '.institutionName'
```

---

## Test 13 — Squad Webhook (Simulate)

This simulates Squad calling your webhook after a transfer.

```bash
SQUAD_SECRET="your_squad_secret_key_here"

BODY='{"transaction_reference":"GHOSTBUSTER_EMP001_a1b2c3d4","transaction_status":"success"}'

# Compute HMAC-SHA512 signature
SIG=$(echo -n "$BODY" | openssl dgst -sha512 -hmac "$SQUAD_SECRET" | awk '{print $2}')

curl -s -X POST http://localhost:8000/api/v1/webhooks/squad \
  -H "Content-Type: application/json" \
  -H "x-squad-signature: $SIG" \
  -d "$BODY" | jq
```

Expected:
```json
{
  "response_code": 200,
  "transaction_reference": "GHOSTBUSTER_EMP001_a1b2c3d4",
  "response_description": "Success"
}
```

Test invalid signature:
```bash
curl -s -X POST http://localhost:8000/api/v1/webhooks/squad \
  -H "Content-Type: application/json" \
  -H "x-squad-signature: invalidsignature" \
  -d "$BODY" | jq
```

Expected:
```json
{ "detail": "Invalid webhook signature" }
```

---

## Test 14 — Interactive Swagger UI

The fastest way to explore all endpoints:

```
http://localhost:8000/docs
```

1. Click **Authorize** (top right)
2. Enter: `Bearer <your_token>`
3. Try any endpoint directly from the browser

---

## Full End-to-End Flow Summary

Run this sequence to validate everything works together:

```bash
# 1. Start server
uvicorn app.main:app --reload --port 8000

# 2. Login
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ghostbuster.io","password":"changeme123"}' | jq -r '.access_token')

# 3. Upload payroll
CYCLE_ID=$(curl -s -X POST http://localhost:8000/api/v1/payroll/cycles \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test_payroll.csv" | jq -r '.id')

# 4. Trigger analysis
curl -s -X POST http://localhost:8000/api/v1/payroll/cycles/$CYCLE_ID/analyze \
  -H "Authorization: Bearer $TOKEN"

# 5. Wait for ready
until [ "$(curl -s http://localhost:8000/api/v1/payroll/cycles/$CYCLE_ID \
  -H "Authorization: Bearer $TOKEN" | jq -r '.processingStatus')" = "ready" ]; do sleep 2; done

# 6. Get first investigation
INV_ID=$(curl -s http://localhost:8000/api/v1/investigations \
  -H "Authorization: Bearer $TOKEN" | jq -r '.[0].id')

# 7. Pause it
curl -s -X POST http://localhost:8000/api/v1/investigations/$INV_ID/actions \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"type":"pause_payment"}'

# 8. Approve it
curl -s -X POST http://localhost:8000/api/v1/investigations/$INV_ID/actions \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"type":"approve_payment"}'

# 9. Check payments
curl -s http://localhost:8000/api/v1/payments/interventions \
  -H "Authorization: Bearer $TOKEN" | jq '[.[] | {employeeId, state, squadRef}]'

# 10. Check audit trail
curl -s http://localhost:8000/api/v1/audit/events \
  -H "Authorization: Bearer $TOKEN" | jq '[.[] | {type, title}]'
```

---

## What to Check At Each Stage

| Step | What to verify |
|------|---------------|
| Upload | `processingStatus: "uploaded"`, `totalEmployees` matches CSV row count |
| Analyze | Status moves `uploaded` → `analyzing` → `ready` |
| After analysis | `flaggedCount` > 0, `integrityScore` < 100, investigations exist |
| pause_payment | Flagged row `paymentStatus: "paused"`, timeline has new entry |
| approve_payment | Payment action `state: "released"`, `squadRef` is set |
| escalate | Investigation `status: "escalated"` |
| Webhook success | Payment action `squad_tx_status: "success"`, flagged row `paymentStatus: "disbursed"` |
| Webhook failed | Flagged row reverts to `paymentStatus: "paused"` |
| Audit log | Every action has a corresponding audit event |
