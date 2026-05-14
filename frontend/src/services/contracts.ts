/**
 * Implied backend contract (replace mock implementations in api.ts):
 *
 * Convention: all monetary amounts are Nigerian Naira (NGN), whole units, unless a field
 * explicitly documents kobo or minor units.
 *
 * GET  /api/v1/integrity/overview          -> IntegrityOverview
 * GET  /api/v1/threat-feed                 -> ThreatFeedItem[]
 * GET  /api/v1/departments/risk            -> DepartmentRisk[]
 * GET  /api/v1/trends/integrity            -> TrendPoint[]
 * GET  /api/v1/payroll/cycles              -> PayrollCycleSummary[] (incl. processingStatus)
 * GET  /api/v1/payroll/cycles/:id         -> PayrollCycleDetail
 * POST /api/v1/payroll/cycles             -> multipart/form-data: field `file` (binary); response e.g. { id }
 * POST /api/v1/payroll/cycles/:id/analyze -> start integrity analysis from staged upload
 * GET  /api/v1/investigations              -> Investigation[]
 * GET  /api/v1/investigations/:id          -> Investigation & EmployeeProfile
 * POST /api/v1/investigations/:id/actions  -> body: { type: InvestigationActionType }
 * GET  /api/v1/relationships/graph         -> { nodes: GraphNode[], edges: GraphEdge[] }
 * GET  /api/v1/relationships/context/:employeeId -> subgraph for employee
 * GET  /api/v1/employees/directory        -> EmployeeDirectoryEntry[]
 * GET  /api/v1/payments/interventions      -> PaymentInterventionRow[]
 * GET  /api/v1/audit/events                -> AuditEvent[]
 * GET  /api/v1/treasury/wallet             -> TreasuryWallet
 * POST /api/v1/treasury/topups/initiate    -> TreasuryTopupInitiateResponse
 * GET  /api/v1/operations/liquidity       -> LiquiditySnapshot
 * GET  /api/v1/payroll/cycles/current      -> PayrollCycleBrief | null (no active run)
 * GET  /api/v1/squad/ledger/recent        -> SquadLedgerEntry[] (?limit=10)
 * GET  /api/v1/operations/queue-stats     -> OperationalQueueStats
 * GET/PUT /api/v1/settings                 -> SystemSettings (or use institutional config service)
 *
 * All list endpoints should support filter query params: severity, status, department, cycleId.
 */

export {};
