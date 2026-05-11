/**
 * Implied backend contract (replace mock implementations in api.ts):
 *
 * GET  /api/v1/integrity/overview          -> IntegrityOverview
 * GET  /api/v1/threat-feed                 -> ThreatFeedItem[]
 * GET  /api/v1/departments/risk            -> DepartmentRisk[]
 * GET  /api/v1/trends/integrity            -> TrendPoint[]
 * GET  /api/v1/payroll/cycles              -> PayrollCycleSummary[] (incl. processingStatus)
 * GET  /api/v1/payroll/cycles/:id         -> PayrollCycleDetail
 * POST /api/v1/payroll/cycles             -> multipart upload OR body: { fileName, employeeCount }
 * POST /api/v1/payroll/cycles/:id/analyze -> start integrity analysis from staged upload
 * GET  /api/v1/investigations              -> Investigation[]
 * GET  /api/v1/investigations/:id          -> Investigation & EmployeeProfile
 * POST /api/v1/investigations/:id/actions  -> body: { type: InvestigationActionType }
 * GET  /api/v1/relationships/graph         -> { nodes: GraphNode[], edges: GraphEdge[] }
 * GET  /api/v1/relationships/context/:employeeId -> subgraph for employee
 * GET  /api/v1/employees/directory        -> EmployeeDirectoryEntry[]
 * GET  /api/v1/payments/interventions      -> PaymentInterventionRow[]
 * GET  /api/v1/audit/events                -> AuditEvent[]
 * GET/PUT /api/v1/settings                 -> SystemSettings (or use institutional config service)
 *
 * All list endpoints should support filter query params: severity, status, department, cycleId.
 */

export {};
