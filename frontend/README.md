# Workforce Integrity Intelligence Interface

This is the frontend application for Workforce Integrity Engine — a continuous payroll integrity intelligence platform designed to help institutions detect suspicious payroll behavior before salary disbursement.

The frontend is designed as:
- an operational intelligence environment
- an investigation-focused workflow system
- a payroll risk monitoring interface

NOT:
- a generic admin dashboard
- a traditional HR management system

---

# Frontend Goals

The frontend focuses on:
- payroll intelligence visibility
- anomaly investigation workflows
- trust score evolution
- explainable AI analysis
- payment intervention operations
- audit transparency

---

# Core Frontend Workflows

## 1. Risk Operations Dashboard
Institution-wide payroll integrity overview.

Displays:
- integrity score
- anomaly trends
- active investigations
- paused disbursements
- department risk heatmaps

---

## 2. Payroll Intelligence Review
Review uploaded payroll cycles and flagged employees.

Displays:
- suspicious salary changes
- trust decay indicators
- anomaly severity
- payment statuses

---

## 3. Investigation Workspace
Deep investigation environment for flagged employees.

Displays:
- trust evolution timeline
- payroll history
- attendance inconsistencies
- relationship intelligence
- explainable anomaly reasoning

Actions:
- pause payment
- approve payment
- escalate investigation

---

## 4. Audit Timeline
Operational audit visibility.

Tracks:
- payroll uploads
- anomaly generation
- payment interventions
- investigation actions

---

# Tech Stack

- Next.js (App Router)
- TypeScript
- TailwindCSS
- TanStack Query
- Zustand
- Recharts
- Framer Motion

---

# Frontend Architecture

```txt
src/
  app/
  modules/
  components/
  services/
  hooks/
  stores/
  types/
  lib/
```

---

# Module Structure

```txt
modules/
  dashboard/
  payroll/
  investigations/
  risk-analysis/
  employees/
  payments/
  audit/
```

---

# State Management

## Server State
Managed with:
- TanStack Query

Used for:
- payroll data
- anomalies
- investigations
- audit logs
- trust scores

---

## Client/UI State
Managed with:
- Zustand

Used for:
- filters
- selected investigations
- drawer states
- UI preferences

---

## Explainable Intelligence
Every anomaly must clearly explain:
- why it was flagged
- confidence level
- supporting evidence

---

## Human-in-the-Loop
AI assists investigators.
AI does not make irreversible autonomous decisions.

---

# Running the Frontend

## Install Dependencies

```bash
npm install
```

---

## Start Development Server

```bash
npm run dev
```

---

## Build for Production

```bash
npm run build
```

---

# Environment Variables

Example:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

# Frontend Responsibilities

The frontend handles:
- payroll review workflows
- anomaly visualization
- investigation tooling
- payment intervention UI
- trust monitoring
- audit visibility

The frontend does NOT:
- run ML models directly
- perform fraud scoring logic
- execute anomaly detection logic

Those responsibilities belong to the backend intelligence engine.

---

# Future Improvements

Potential future enhancements:
- real-time anomaly streaming
- advanced graph intelligence visualization
- institutional benchmarking
- collaborative investigations
- predictive risk forecasting

---

# Final Note

The frontend is intentionally designed around:
# operational payroll intelligence workflows

rather than traditional dashboard aesthetics.

The primary objective is to create a believable workforce integrity intelligence environment that supports real investigation and financial intervention workflows.