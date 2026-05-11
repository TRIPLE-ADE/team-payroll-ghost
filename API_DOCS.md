# GhostGuard API — Frontend Integration Docs

**Base URL:** `https://<backend-cloud-run-url>`  
**Local dev:** `http://localhost:8000`  
**Interactive docs (Swagger):** `http://localhost:8000/docs`

---

## Authentication

All endpoints except `/health` and `/api/v1/webhooks/squad` require a JWT bearer token.

### POST `/api/v1/auth/login`

```http
POST /api/v1/auth/login
Content-Type: application/json
```

**Request body:**
```json
{
  "email": "admin@ghostguard.io",
  "password": "changeme123"
}
```

**Response `200`:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Usage — attach to every subsequent request:**
```
Authorization: Bearer <access_token>
```

Token expires after **60 minutes**.

---

## Dashboard / Integrity

### GET `/api/v1/integrity/overview`

Summary stats for the dashboard header cards.

**Response `200`:**
```json
{
  "payrollIntegrityScore": 87,
  "flaggedDisbursements": 12,
  "activeInvestigations": 5,
  "pausedPayments": 3
}
```

---

### GET `/api/v1/threat-feed`

Last 20 anomaly, intervention, and investigation events — for the live threat feed panel.

**Response `200`:**
```json
[
  {
    "id": "uuid",
    "timestamp": "2026-05-11T10:30:00+00:00",
    "title": "High risk detected — duplicate payout cluster",
    "severity": "high",
    "department": null
  }
]
```

`severity` values: `"high"` (anomaly events) | `"medium"` (intervention/investigation events)

---

### GET `/api/v1/departments/risk`

Per-department risk breakdown for the risk heatmap.

**Response `200`:**
```json
[
  {
    "department": "Finance Ops",
    "anomalyCount": 6,
    "trustDelta": -15,
    "riskLevel": "high"
  },
  {
    "department": "HR",
    "anomalyCount": 2,
    "trustDelta": -5,
    "riskLevel": "medium"
  }
]
```

`riskLevel`: `"high"` (4+ anomalies) | `"medium"` (2–3) | `"low"` (0–1)

---

### GET `/api/v1/trends/integrity`

4-week integrity trend for the trend chart.

**Response `200`:**
```json
[
  { "period": "W1", "integrityScore": 91, "anomalyCount": 2 },
  { "period": "W2", "integrityScore": 88, "anomalyCount": 5 },
  { "period": "W3", "integrityScore": 85, "anomalyCount": 7 },
  { "period": "W4", "integrityScore": 87, "anomalyCount": 4 }
]
```

---

## Payroll Cycles

### GET `/api/v1/payroll/cycles`

List all payroll cycles, newest first.

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `status` | string (optional) | Filter by `uploaded` \| `analyzing` \| `ready` \| `locked` |

**Response `200`:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "label": "May 2026 — Upload",
    "uploadedAt": "2026-05-11T10:00:00+00:00",
    "totalEmployees": 500,
    "totalDisbursement": 25000000.0,
    "flaggedCount": 12,
    "pausedPayments": 3,
    "integrityScore": 87,
    "processingStatus": "ready",
    "sourceFile": "may_payroll.csv"
  }
]
```

`processingStatus` lifecycle: `uploaded` → `analyzing` → `ready` → `locked`

---

### GET `/api/v1/payroll/cycles/{id}`

Single cycle with its full flagged queue.

**Response `200`:**
```json
{
  "id": "550e8400-...",
  "label": "May 2026 — Upload",
  "uploadedAt": "2026-05-11T10:00:00+00:00",
  "totalEmployees": 500,
  "totalDisbursement": 25000000.0,
  "flaggedCount": 12,
  "pausedPayments": 3,
  "integrityScore": 87,
  "processingStatus": "ready",
  "sourceFile": "may_payroll.csv",
  "flaggedRows": [
    {
      "employeeId": "EMP001234",
      "employeeName": "Amara Okafor",
      "trustScore": 42,
      "trustPrevious": 78,
      "anomalyLabels": ["Shared bank account", "Zero attendance recorded"],
      "attendanceNotes": ["Avg attendance: 0.5 days/month"],
      "paymentStatus": "scheduled",
      "investigationStatus": "open",
      "investigationId": "a1b2c3d4-...",
      "relationshipWarning": null,
      "severity": "high"
    }
  ]
}
```

`paymentStatus`: `"scheduled"` | `"paused"` | `"approved"` | `"disbursed"`  
`investigationStatus`: `"none"` | `"open"` | `"in_review"` | `"escalated"` | `"closed"`

---

### POST `/api/v1/payroll/cycles`

Upload a payroll CSV file. Creates a new cycle and upserts employees.

**Request:** `multipart/form-data`
| Field | Type | Description |
|-------|------|-------------|
| `file` | file | CSV payroll file |

**Required CSV columns:**
```
emp_id, salary, grade_level, tenure_months
```

**All supported CSV columns:**
```
emp_id          (required) e.g. EMP001234
salary          (required) naira amount e.g. 450000
grade_level     (required) e.g. GL-07
tenure_months   (required) integer e.g. 36

name / full_name
role
department / mda
bvn
nin
account_number
bank_code
bank / bank_name
dob / date_of_birth
gender
phone / phone_number
hire_date
avg_attendance_days    (default: 20)
months_no_deduction    (default: 0)
leave_days_taken       (default: 0)
promotion_count        (default: 0)
```

**Response `200`:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error `400`:**
```json
{
  "detail": "Missing CSV columns: {'bvn', 'salary'}"
}
```

---

### POST `/api/v1/payroll/cycles/{id}/analyze`

Trigger ML analysis on an uploaded cycle. Returns immediately; analysis runs in background.

> **Note:** Can only be triggered when `processingStatus == "uploaded"`. Poll `GET /cycles/{id}` until `processingStatus == "ready"`.

**Response `200`:**
```json
{
  "ok": true,
  "message": "Analysis started"
}
```

**Error `400`:**
```json
{
  "detail": "Analysis can only start from 'uploaded' status (current: analyzing)"
}
```

---

## Investigations

### GET `/api/v1/investigations`

List all investigations, newest first.

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `status` | string (optional) | Filter by `open` \| `in_review` \| `escalated` \| `closed` |

**Response `200`:**
```json
[
  {
    "id": "a1b2c3d4-...",
    "employeeId": "EMP001234",
    "cycleId": "550e8400-...",
    "status": "open",
    "openedAt": "2026-05-11T10:30:00+00:00",
    "explainableFactors": [
      {
        "id": "f1",
        "title": "Shared bank account",
        "detail": "Shared bank account — duplicate payout cluster detected",
        "confidence": 90,
        "evidence": ["Duplicate payout cluster detected"],
        "historicalNote": null,
        "peerNote": null
      }
    ],
    "timeline": [
      {
        "id": "t1",
        "type": "anomaly",
        "summary": "High risk detected — score 72.5",
        "severity": "high",
        "detectedAt": "2026-05-11T10:30:00+00:00",
        "trustAtPoint": 42
      }
    ],
    "trustSeries": [
      { "at": "2026-05-11T10:30:00+00:00", "score": 42 }
    ]
  }
]
```

---

### GET `/api/v1/investigations/{id}`

Single investigation with full employee profile.

**Response `200`:**
```json
{
  "investigation": {
    "id": "a1b2c3d4-...",
    "employeeId": "EMP001234",
    "cycleId": "550e8400-...",
    "status": "open",
    "openedAt": "2026-05-11T10:30:00+00:00",
    "explainableFactors": [...],
    "timeline": [...],
    "trustSeries": [...]
  },
  "employee": {
    "id": "EMP001234",
    "name": "Amara Okafor",
    "role": "Senior Accountant",
    "department": "Finance Ops",
    "verificationExpiresAt": "2026-08-01T00:00:00+00:00",
    "verificationStatus": "current",
    "trustScore": 42,
    "peerGroupAvgTrust": 81,
    "payrollHistoryMonths": [
      { "month": "Dec 2025", "amount": 450000.0 },
      { "month": "Jan 2026", "amount": 450000.0 }
    ]
  }
}
```

---

### POST `/api/v1/investigations/{id}/actions`

Submit a review action on an investigation.

**Request body:**
```json
{
  "type": "pause_payment"
}
```

**`type` values:**

| Value | Effect |
|-------|--------|
| `pause_payment` | Flags payment as paused, adds timeline event |
| `approve_payment` | Validates BVN via Squad → initiates salary transfer → closes investigation |
| `escalate` | Sets status to `escalated`, adds timeline event |
| `request_verification` | Triggers BVN verification via Squad, updates employee `verificationStatus` |

**Response `200` (success):**
```json
{
  "ok": true,
  "message": "Action recorded"
}
```

**Response `200` (BVN mismatch — payment blocked):**
```json
{
  "ok": false,
  "message": "BVN mismatch: Name does not match Central Bank records"
}
```

---

## Employees

### GET `/api/v1/employees/directory`

Full employee directory with risk levels.

**Response `200`:**
```json
[
  {
    "id": "EMP001234",
    "name": "Amara Okafor",
    "role": "Senior Accountant",
    "department": "Finance Ops",
    "verificationExpiresAt": null,
    "verificationStatus": "expired",
    "trustScore": 42,
    "peerGroupAvgTrust": 81,
    "payrollHistoryMonths": [],
    "riskLevel": "high",
    "lastNetPay": 450000.0
  }
]
```

`riskLevel` computed from `trustScore`:
- `"high"` — trust < 55
- `"medium"` — trust 55–74
- `"low"` — trust ≥ 75

---

## Payments

### GET `/api/v1/payments/interventions`

All payment intervention records with history.

**Response `200`:**
```json
[
  {
    "id": "uuid",
    "employeeId": "EMP001234",
    "employeeName": "Amara Okafor",
    "cycleId": "550e8400-...",
    "cycleLabel": "May 2026 — Upload",
    "state": "released",
    "netAmount": 450000.0,
    "updatedAt": "2026-05-11T11:00:00+00:00",
    "squadRef": "GHOSTGUARD_EMP001234_a1b2c3d4",
    "history": [
      {
        "at": "2026-05-11T10:35:00+00:00",
        "action": "Disbursement paused — integrity hold",
        "actor": "operator.console"
      },
      {
        "at": "2026-05-11T11:00:00+00:00",
        "action": "Payment approved and released for disbursement",
        "actor": "operator.console"
      }
    ]
  }
]
```

`state`: `"pending"` | `"paused"` | `"released"` | `"escalated"`

---

## Relationships (Fraud Graph)

### GET `/api/v1/relationships/graph`

Full relationship graph for the network visualisation.

**Response `200`:**
```json
{
  "nodes": [
    {
      "id": "EMP001234",
      "label": "Amara Okafor",
      "type": "employee",
      "risk": "high"
    },
    {
      "id": "cluster-EMP001234-EMP005678",
      "label": "Payout cluster ACCT",
      "type": "cluster",
      "risk": "high"
    }
  ],
  "edges": [
    {
      "id": "uuid",
      "source": "EMP001234",
      "target": "cluster-EMP001234-EMP005678",
      "label": "shared routing"
    }
  ]
}
```

`node.type`: `"employee"` | `"account"` | `"cluster"`

---

### GET `/api/v1/relationships/context/{employeeId}`

1-hop subgraph around a specific employee. Use `employeeId` string (e.g. `EMP001234`).

**Response `200`:**
```json
{
  "node": {
    "id": "EMP001234",
    "label": "Amara Okafor",
    "type": "employee",
    "risk": "high"
  },
  "neighbors": [
    {
      "node": {
        "id": "cluster-EMP001234-EMP005678",
        "label": "Payout cluster ACCT",
        "type": "cluster",
        "risk": "high"
      },
      "edge": {
        "id": "uuid",
        "source": "EMP001234",
        "target": "cluster-EMP001234-EMP005678",
        "label": "shared routing"
      }
    }
  ]
}
```

---

## Audit

### GET `/api/v1/audit/events`

Last 100 audit events, newest first.

**Response `200`:**
```json
[
  {
    "id": "uuid",
    "at": "2026-05-11T10:30:00+00:00",
    "type": "anomaly",
    "title": "Integrity analysis complete",
    "detail": "12 case(s) queued for review",
    "actor": "engine.anomaly",
    "refId": "550e8400-..."
  }
]
```

`type` values: `"payroll_upload"` | `"anomaly"` | `"intervention"` | `"investigation"` | `"verification"`

---

## Settings

### GET `/api/v1/settings`

**Response `200`:**
```json
{
  "institutionName": "Federal Ministry of Finance",
  "riskTrustFloor": 55,
  "anomalySensitivity": "standard",
  "notifyReviewersEmail": true,
  "notifyEscalationsSlack": false
}
```

---

### PUT `/api/v1/settings`

Partial update — only include fields you want to change.

**Request body:**
```json
{
  "institutionName": "Ministry of Budget",
  "anomalySensitivity": "high"
}
```

`anomalySensitivity` values: `"low"` | `"standard"` | `"high"`

**Response `200`:** Updated `SystemSettings` object (same shape as GET).

---

## Webhooks

### POST `/api/v1/webhooks/squad`

Receives payment status updates from Squad. **No JWT required.**

**Headers:**
```
x-squad-signature: <hmac-sha512 of request body>
```

**Request body (Squad sends this):**
```json
{
  "transaction_reference": "GHOSTGUARD_EMP001234_a1b2c3d4",
  "transaction_status": "success"
}
```

**Response `200`:**
```json
{
  "response_code": 200,
  "transaction_reference": "GHOSTGUARD_EMP001234_a1b2c3d4",
  "response_description": "Success"
}
```

> This endpoint is called by Squad's infrastructure — no frontend interaction needed.

---

## System Endpoints

### GET `/health`

```json
{ "status": "ok", "service": "ghostguard-backend" }
```

### GET `/`

```json
{
  "service": "GhostBuster API",
  "version": "1.0.0",
  "docs": "/docs"
}
```

---

## Common Error Responses

| Status | Meaning |
|--------|---------|
| `401 Unauthorized` | Missing or expired JWT token |
| `404 Not Found` | Resource does not exist |
| `400 Bad Request` | Validation error (check `detail` field) |
| `500 Internal Server Error` | Unexpected server error |

All errors return:
```json
{
  "detail": "Error description here"
}
```