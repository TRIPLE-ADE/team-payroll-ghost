import type {
  AuditEvent,
  DepartmentRisk,
  EmployeeDirectoryEntry,
  EmployeeProfile,
  FlaggedQueueRow,
  GraphEdge,
  GraphNode,
  IntegrityOverview,
  Investigation,
  InvestigationActionType,
  InvestigationStatus,
  PaymentInterventionRow,
  PaymentStatus,
  PayrollCycleDetail,
  PayrollCycleSummary,
  RiskSeverity,
  ThreatFeedItem,
  TrendPoint,
} from "@/types/domain";

const cycleId = "cy-may-2026";

function delay<T>(ms: number, v: T): Promise<T> {
  return new Promise((r) => setTimeout(() => r(v), ms));
}

const employees: Record<string, EmployeeProfile> = {
  "emp-204": {
    id: "emp-204",
    name: "Jordan Hale",
    role: "Senior Payroll Specialist",
    department: "Finance Ops",
    verificationExpiresAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    verificationStatus: "expired",
    trustScore: 41,
    peerGroupAvgTrust: 78,
    payrollHistoryMonths: [
      { month: "Jan", amount: 7200 },
      { month: "Feb", amount: 7280 },
      { month: "Mar", amount: 30400 },
      { month: "Apr", amount: 31200 },
    ],
  },
  "emp-118": {
    id: "emp-118",
    name: "Priya Nair",
    role: "Warehouse Lead",
    department: "Logistics",
    verificationExpiresAt: new Date(Date.now() + 86400000 * 12).toISOString(),
    verificationStatus: "current",
    trustScore: 63,
    peerGroupAvgTrust: 74,
    payrollHistoryMonths: [
      { month: "Jan", amount: 5100 },
      { month: "Feb", amount: 5150 },
      { month: "Mar", amount: 9800 },
      { month: "Apr", amount: 9900 },
    ],
  },
  "emp-442": {
    id: "emp-442",
    name: "Marcus Chen",
    role: "IT Support Analyst",
    department: "Technology",
    verificationExpiresAt: new Date(Date.now() + 86400000 * 4).toISOString(),
    verificationStatus: "expiring",
    trustScore: 58,
    peerGroupAvgTrust: 81,
    payrollHistoryMonths: [
      { month: "Jan", amount: 4600 },
      { month: "Feb", amount: 4620 },
      { month: "Mar", amount: 4600 },
      { month: "Apr", amount: 9200 },
    ],
  },
  "emp-501": {
    id: "emp-501",
    name: "Elena Voss",
    role: "Compliance Analyst",
    department: "Clinical",
    verificationExpiresAt: new Date(Date.now() + 86400000 * 40).toISOString(),
    verificationStatus: "current",
    trustScore: 86,
    peerGroupAvgTrust: 79,
    payrollHistoryMonths: [
      { month: "Jan", amount: 6200 },
      { month: "Feb", amount: 6200 },
      { month: "Mar", amount: 6250 },
      { month: "Apr", amount: 6300 },
    ],
  },
  "emp-502": {
    id: "emp-502",
    name: "David Okonkwo",
    role: "Facilities Coordinator",
    department: "Operations",
    verificationExpiresAt: new Date(Date.now() + 86400000 * 2).toISOString(),
    verificationStatus: "expiring",
    trustScore: 69,
    peerGroupAvgTrust: 76,
    payrollHistoryMonths: [
      { month: "Jan", amount: 4400 },
      { month: "Feb", amount: 4400 },
      { month: "Mar", amount: 4425 },
      { month: "Apr", amount: 4450 },
    ],
  },
};

const investigationsData: Record<string, Investigation> = {
  "inv-901": {
    id: "inv-901",
    employeeId: "emp-204",
    cycleId,
    status: "in_review",
    openedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    explainableFactors: [
      {
        id: "f1",
        title: "Salary disbursement anomaly",
        detail: "Net pay increased 320% versus peer-adjusted baseline for role band.",
        confidence: 91,
        evidence: [
          "Mar–Apr cycle delta vs 12-mo median",
          "Approval chain missing secondary attestor",
        ],
        historicalNote: "Prior 8 cycles within 4% of median.",
        peerNote: "Finance Ops peer group avg change +2.1% same period.",
      },
      {
        id: "f2",
        title: "Verification state",
        detail: "Workforce verification expired before disbursement window.",
        confidence: 88,
        evidence: ["IDV expiry 2 days before pay date", "No re-verify ticket"],
        historicalNote: "Previously renewed 11 days early on average.",
      },
      {
        id: "f3",
        title: "Attendance correlation",
        detail: "Time-card pattern inconsistent with disbursement amount.",
        confidence: 74,
        evidence: ["2 cycles incomplete attendance closure"],
        peerNote: "Department closed 98.4% of timesheets on time.",
      },
    ],
    timeline: [
      {
        id: "t1",
        type: "trust_shift",
        summary: "Trust score declined 92 → 84 after attendance variance",
        severity: "medium",
        detectedAt: new Date(Date.now() - 86400000 * 21).toISOString(),
        trustAtPoint: 84,
      },
      {
        id: "t2",
        type: "salary_spike",
        summary: "Salary spike detected vs rolling baseline",
        severity: "high",
        detectedAt: new Date(Date.now() - 86400000 * 14).toISOString(),
        trustAtPoint: 63,
      },
      {
        id: "t3",
        type: "verification",
        summary: "Verification expired — exposure before pay run",
        severity: "high",
        detectedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        trustAtPoint: 41,
      },
    ],
    trustSeries: [
      { at: new Date(Date.now() - 86400000 * 45).toISOString(), score: 92 },
      { at: new Date(Date.now() - 86400000 * 30).toISOString(), score: 88 },
      { at: new Date(Date.now() - 86400000 * 21).toISOString(), score: 84 },
      { at: new Date(Date.now() - 86400000 * 14).toISOString(), score: 63 },
      { at: new Date(Date.now() - 86400000 * 7).toISOString(), score: 52 },
      { at: new Date(Date.now() - 86400000 * 2).toISOString(), score: 41 },
    ],
  },
  "inv-902": {
    id: "inv-902",
    employeeId: "emp-118",
    cycleId,
    status: "open",
    openedAt: new Date(Date.now() - 86400000).toISOString(),
    explainableFactors: [
      {
        id: "f1",
        title: "Duplicate payout cluster",
        detail: "Shared routing identifier with another active employee record.",
        confidence: 86,
        evidence: [
          "Matching secondary account token hash",
          "Linked anomaly chain ACCT-77",
        ],
        peerNote: "Logistics cluster 3 linked cases in last 90 days.",
      },
    ],
    timeline: [
      {
        id: "t1",
        type: "relationship",
        summary: "Shared payout account detected",
        severity: "high",
        detectedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        trustAtPoint: 71,
      },
      {
        id: "t2",
        type: "cluster",
        summary: "Merged into duplicate payout cluster review",
        severity: "high",
        detectedAt: new Date(Date.now() - 86400000).toISOString(),
        trustAtPoint: 63,
      },
    ],
    trustSeries: [
      { at: new Date(Date.now() - 86400000 * 60).toISOString(), score: 88 },
      { at: new Date(Date.now() - 86400000 * 30).toISOString(), score: 79 },
      { at: new Date(Date.now() - 86400000 * 10).toISOString(), score: 71 },
      { at: new Date(Date.now() - 86400000).toISOString(), score: 63 },
    ],
  },
  "inv-903": {
    id: "inv-903",
    employeeId: "emp-442",
    cycleId,
    status: "escalated",
    openedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    explainableFactors: [
      {
        id: "f1",
        title: "Attendance inconsistency",
        detail: "Absence pattern inconsistent with on-call obligations.",
        confidence: 69,
        evidence: ["Unclosed shifts during pay period"],
      },
    ],
    timeline: [
      {
        id: "t1",
        type: "attendance",
        summary: "Attendance inconsistency spike",
        severity: "medium",
        detectedAt: new Date(Date.now() - 86400000 * 6).toISOString(),
        trustAtPoint: 72,
      },
      {
        id: "t2",
        type: "escalation",
        summary: "Escalated to regional workforce integrity",
        severity: "medium",
        detectedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        trustAtPoint: 58,
      },
    ],
    trustSeries: [
      { at: new Date(Date.now() - 86400000 * 40).toISOString(), score: 85 },
      { at: new Date(Date.now() - 86400000 * 20).toISOString(), score: 78 },
      { at: new Date(Date.now() - 86400000 * 6).toISOString(), score: 72 },
      { at: new Date(Date.now() - 86400000 * 2).toISOString(), score: 58 },
    ],
  },
};

const rows: FlaggedQueueRow[] = [
  {
    employeeId: "emp-204",
    employeeName: "Jordan Hale",
    trustScore: 41,
    trustPrevious: 52,
    anomalyLabels: ["Salary spike", "Verification expired"],
    attendanceNotes: [
      "2 cycles incomplete timesheet closure",
      "Auto punch variance vs schedule 14%",
    ],
    paymentStatus: "paused",
    investigationStatus: "in_review",
    investigationId: "inv-901",
    relationshipWarning: "Watchlist: shared approval delegate",
    severity: "high",
  },
  {
    employeeId: "emp-118",
    employeeName: "Priya Nair",
    trustScore: 63,
    trustPrevious: 71,
    anomalyLabels: ["Duplicate payout cluster"],
    attendanceNotes: ["Shift overlap with linked record set"],
    paymentStatus: "scheduled",
    investigationStatus: "open",
    investigationId: "inv-902",
    relationshipWarning: "Linked to ACCT-77",
    severity: "high",
  },
  {
    employeeId: "emp-442",
    employeeName: "Marcus Chen",
    trustScore: 58,
    trustPrevious: 72,
    anomalyLabels: ["Attendance variance"],
    attendanceNotes: [
      "Unclosed on-call blocks during pay period",
      "Dept baseline closure 98.4%",
    ],
    paymentStatus: "paused",
    investigationStatus: "escalated",
    investigationId: "inv-903",
    severity: "medium",
  },
];

let overview: IntegrityOverview = {
  payrollIntegrityScore: 71,
  flaggedDisbursements: 14,
  activeInvestigations: 6,
  pausedPayments: 2,
};

const threatFeed: ThreatFeedItem[] = [
  {
    id: "th-1",
    timestamp: new Date().toISOString(),
    title: "Duplicate payout cluster detected — Logistics",
    severity: "high",
    department: "Logistics",
  },
  {
    id: "th-2",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    title: "Suspicious salary escalation — Finance Ops",
    severity: "high",
    department: "Finance Ops",
  },
  {
    id: "th-3",
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    title: "Attendance inconsistency spike — Technology",
    severity: "medium",
    department: "Technology",
  },
];

const departmentRisk: DepartmentRisk[] = [
  {
    department: "Finance Ops",
    anomalyCount: 5,
    trustDelta: -8,
    riskLevel: "high",
  },
  {
    department: "Logistics",
    anomalyCount: 4,
    trustDelta: -5,
    riskLevel: "high",
  },
  {
    department: "Technology",
    anomalyCount: 3,
    trustDelta: -3,
    riskLevel: "medium",
  },
  {
    department: "Clinical",
    anomalyCount: 1,
    trustDelta: -1,
    riskLevel: "low",
  },
];

const trends: TrendPoint[] = [
  { period: "W1", integrityScore: 76, anomalyCount: 9 },
  { period: "W2", integrityScore: 74, anomalyCount: 11 },
  { period: "W3", integrityScore: 73, anomalyCount: 12 },
  { period: "W4", integrityScore: 71, anomalyCount: 14 },
];

const cycles: PayrollCycleDetail[] = [
  {
    id: cycleId,
    label: "May 2026 — Biweekly",
    uploadedAt: new Date(Date.now() - 86400000).toISOString(),
    totalEmployees: 1842,
    totalDisbursement: 4289000,
    flaggedCount: rows.length,
    pausedPayments: rows.filter((r) => r.paymentStatus === "paused").length,
    integrityScore: 71,
    processingStatus: "ready",
    sourceFile: "payroll_may2026_biweekly.csv",
    flaggedRows: rows,
  },
  {
    id: "cy-apr-2026",
    label: "Apr 2026 — Biweekly",
    uploadedAt: new Date(Date.now() - 86400000 * 18).toISOString(),
    totalEmployees: 1820,
    totalDisbursement: 4102000,
    flaggedCount: 0,
    pausedPayments: 0,
    integrityScore: 82,
    processingStatus: "locked",
    sourceFile: "payroll_apr2026_biweekly.csv",
    flaggedRows: [],
  },
];

function riskFromTrust(score: number): RiskSeverity {
  if (score < 55) return "high";
  if (score < 75) return "medium";
  return "low";
}

function buildEmployeeDirectory(): EmployeeDirectoryEntry[] {
  return Object.values(employees).map((e) => ({
    ...e,
    riskLevel: riskFromTrust(e.trustScore),
    lastNetPay: e.payrollHistoryMonths.at(-1)?.amount,
  }));
}

function buildPaymentInterventions(): PaymentInterventionRow[] {
  const out: PaymentInterventionRow[] = [];
  for (const c of cycles) {
    if (c.processingStatus === "uploaded" || c.processingStatus === "analyzing") {
      continue;
    }
    for (const r of c.flaggedRows) {
      const state: PaymentInterventionRow["state"] =
        r.investigationStatus === "escalated"
          ? "escalated"
          : r.paymentStatus === "paused"
            ? "paused"
            : r.paymentStatus === "approved"
              ? "released"
              : "pending";
      out.push({
        id: `pi-${c.id}-${r.employeeId}`,
        employeeId: r.employeeId,
        employeeName: r.employeeName,
        cycleId: c.id,
        cycleLabel: c.label,
        state,
        netAmount: r.trustScore < 50 ? 30400 : r.trustScore < 65 ? 9900 : 9200,
        updatedAt: new Date(Date.now() - 3600000 * (out.length + 1)).toISOString(),
        squadRef:
          state === "paused"
            ? `SQUAD-HOLD-${r.employeeId.slice(-3)}`
            : state === "released"
              ? `SQUAD-REL-${r.employeeId.slice(-3)}`
              : undefined,
        history: [
          {
            at: new Date(Date.now() - 86400000 * 3).toISOString(),
            action: "Scheduled in disbursement batch",
            actor: "treasury.sched",
          },
          ...(state === "paused"
            ? [
                {
                  at: new Date(Date.now() - 3600000 * 10).toISOString(),
                  action: "Disbursement paused — integrity hold",
                  actor: "operator.console",
                },
              ]
            : []),
          ...(state === "escalated"
            ? [
                {
                  at: new Date(Date.now() - 3600000 * 6).toISOString(),
                  action: "Escal tier-2 workforce integrity",
                  actor: "analyst.mstone",
                },
              ]
            : []),
          ...(state === "released"
            ? [
                {
                  at: new Date(Date.now() - 3600000 * 12).toISOString(),
                  action: "Released for pay run after clearance",
                  actor: "operator.console",
                },
              ]
            : []),
        ],
      });
    }
  }
  return out.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

const auditEvents: AuditEvent[] = [
  {
    id: "au-1",
    at: new Date(Date.now() - 86400000 * 2).toISOString(),
    type: "payroll_upload",
    title: "Payroll cycle ingested",
    detail: "May 2026 biweekly — 1,842 employees",
    actor: "system.ingest",
    refId: cycleId,
  },
  {
    id: "au-2",
    at: new Date(Date.now() - 86400000).toISOString(),
    type: "anomaly",
    title: "Anomaly batch generated",
    detail: "14 disbursements queued for integrity review",
    actor: "engine.anomaly",
  },
  {
    id: "au-3",
    at: new Date(Date.now() - 86400000 + 600000).toISOString(),
    type: "investigation",
    title: "Investigation opened",
    detail: "INV-901 — Jordan Hale",
    actor: "analyst.jdoe",
    refId: "inv-901",
  },
  {
    id: "au-4",
    at: new Date(Date.now() - 3600000 * 8).toISOString(),
    type: "intervention",
    title: "Payment paused pending review",
    detail: "Employee emp-204 — scheduled disbursement held",
    actor: "analyst.jdoe",
    refId: "emp-204",
  },
  {
    id: "au-5",
    at: new Date(Date.now() - 3600000 * 2).toISOString(),
    type: "verification",
    title: "Verification re-request queued",
    detail: "IDV refresh requested for Finance Ops case",
    actor: "analyst.mstone",
  },
];

const graphNodes: GraphNode[] = [
  { id: "emp-204", label: "Jordan Hale", type: "employee", risk: "high" },
  { id: "emp-118", label: "Priya Nair", type: "employee", risk: "high" },
  { id: "acct-77", label: "Payout cluster ACCT-77", type: "account" },
  { id: "cl-1", label: "Logistics anomaly cluster", type: "cluster", risk: "high" },
];

const graphEdges: GraphEdge[] = [
  { id: "e1", source: "emp-118", target: "acct-77", label: "shared routing" },
  { id: "e2", source: "emp-204", target: "cl-1", label: "approval path" },
  { id: "e3", source: "emp-118", target: "cl-1", label: "geo window" },
];

function syncOverviewFromRows() {
  for (const c of cycles) {
    c.pausedPayments = c.flaggedRows.filter((r) => r.paymentStatus === "paused").length;
    c.flaggedCount = c.flaggedRows.length;
  }
  const active = cycles.filter(
    (c) => c.processingStatus === "ready" || c.processingStatus === "locked",
  );
  const flagged = active.reduce((s, c) => s + c.flaggedCount, 0);
  const paused = active.reduce((s, c) => s + c.pausedPayments, 0);
  const avgIntegrity =
    active.length === 0
      ? overview.payrollIntegrityScore
      : Math.round(
          active.reduce((s, c) => s + c.integrityScore, 0) / active.length,
        );
  overview = {
    ...overview,
    payrollIntegrityScore: avgIntegrity,
    pausedPayments: paused,
    flaggedDisbursements: flagged,
    activeInvestigations: Object.values(investigationsData).filter(
      (i) => i.status !== "closed",
    ).length,
  };
}

function pushAudit(event: Omit<AuditEvent, "id" | "at"> & { at?: string }) {
  auditEvents.unshift({
    id: `au-${Date.now()}`,
    at: event.at ?? new Date().toISOString(),
    type: event.type,
    title: event.title,
    detail: event.detail,
    actor: event.actor,
    refId: event.refId,
  });
}

export const mockApi = {
  async getOverview() {
    syncOverviewFromRows();
    return delay(150, structuredClone(overview));
  },

  async getThreatFeed() {
    return delay(120, structuredClone(threatFeed));
  },

  async getDepartmentRisk() {
    return delay(120, structuredClone(departmentRisk));
  },

  async getTrends() {
    return delay(120, structuredClone(trends));
  },

  async listPayrollCycles(): Promise<PayrollCycleSummary[]> {
    syncOverviewFromRows();
    return delay(
      100,
      cycles.map(
        ({
          id,
          label,
          uploadedAt,
          totalEmployees,
          totalDisbursement,
          flaggedCount,
          pausedPayments,
          integrityScore,
          processingStatus,
          sourceFile,
        }) => ({
          id,
          label,
          uploadedAt,
          totalEmployees,
          totalDisbursement,
          flaggedCount,
          pausedPayments,
          integrityScore,
          processingStatus,
          sourceFile,
        }),
      ),
    );
  },

  async getPayrollCycle(id: string): Promise<PayrollCycleDetail | null> {
    const c = cycles.find((x) => x.id === id);
    return delay(100, c ? structuredClone(c) : null);
  },

  async listInvestigations(): Promise<Investigation[]> {
    return delay(100, structuredClone(Object.values(investigationsData)));
  },

  async getInvestigation(id: string): Promise<{
    investigation: Investigation;
    employee: EmployeeProfile;
  } | null> {
    const inv = investigationsData[id];
    if (!inv) return delay(50, null);
    const employee = employees[inv.employeeId];
    if (!employee) return delay(50, null);
    return delay(120, {
      investigation: structuredClone(inv),
      employee: structuredClone(employee),
    });
  },

  async getRelationships() {
    return delay(100, {
      nodes: structuredClone(graphNodes),
      edges: structuredClone(graphEdges),
    });
  },

  async getAuditEvents() {
    return delay(100, structuredClone(auditEvents));
  },

  async getEmployeesDirectory() {
    syncOverviewFromRows();
    return delay(120, buildEmployeeDirectory());
  },

  async getPaymentInterventions() {
    syncOverviewFromRows();
    return delay(100, buildPaymentInterventions());
  },

  async getRelationshipContext(employeeId: string) {
    const nodes = structuredClone(graphNodes);
    const edges = structuredClone(graphEdges);
    const keep = new Set<string>([employeeId]);
    for (const e of edges) {
      if (e.source === employeeId) keep.add(e.target);
      if (e.target === employeeId) keep.add(e.source);
    }
    return delay(80, {
      nodes: nodes.filter((n) => keep.has(n.id)),
      edges: edges.filter(
        (e) => keep.has(e.source) && keep.has(e.target),
      ),
    });
  },

  async uploadPayrollBatch(input: { fileName: string; employeeCount: number }) {
    const id = `cy-up-${Date.now()}`;
    const totalDisbursement = input.employeeCount * 2450;
    cycles.unshift({
      id,
      label: `Staging · ${input.fileName.replace(/\.[^.]+$/, "")}`,
      uploadedAt: new Date().toISOString(),
      totalEmployees: input.employeeCount,
      totalDisbursement,
      flaggedCount: 0,
      pausedPayments: 0,
      integrityScore: 0,
      processingStatus: "uploaded",
      sourceFile: input.fileName,
      flaggedRows: [],
    });
    pushAudit({
      type: "payroll_upload",
      title: "Payroll batch staged",
      detail: `${input.fileName} — ${input.employeeCount} rows (awaiting analysis)`,
      actor: "operator.upload",
      refId: id,
    });
    return delay(250, { id });
  },

  async startCycleAnalysis(cycleId: string): Promise<{ ok: boolean; message: string }> {
    const c = cycles.find((x) => x.id === cycleId);
    if (!c) return delay(50, { ok: false, message: "Cycle not found" });
    if (c.processingStatus !== "uploaded") {
      return delay(50, {
        ok: false,
        message: "Analysis can only start from staged uploads",
      });
    }
    c.processingStatus = "analyzing";
    await delay(700, null);
    c.processingStatus = "ready";
    c.integrityScore = 74;
    const probeRow: FlaggedQueueRow = {
      employeeId: "emp-502",
      employeeName: employees["emp-502"]?.name ?? "David Okonkwo",
      trustScore: 62,
      trustPrevious: 70,
      anomalyLabels: ["Post-upload variance check"],
      attendanceNotes: ["One open exception during staging window"],
      paymentStatus: "scheduled",
      investigationStatus: "none",
      severity: "medium",
    };
    c.flaggedRows = [probeRow];
    c.flaggedCount = 1;
    c.pausedPayments = 0;
    pushAudit({
      type: "anomaly",
      title: "Integrity analysis complete",
      detail: `${c.label} — ${c.flaggedCount} case(s) queued`,
      actor: "engine.anomaly",
      refId: cycleId,
    });
    syncOverviewFromRows();
    return delay(100, { ok: true, message: "Analysis complete" });
  },

  async submitInvestigationAction(
    investigationId: string,
    type: InvestigationActionType,
  ): Promise<{ ok: boolean; message: string }> {
    const inv = investigationsData[investigationId];
    if (!inv) return delay(80, { ok: false, message: "Investigation not found" });

    const cycle = cycles.find((c) => c.id === inv.cycleId);
    const row = cycle?.flaggedRows.find((r) => r.employeeId === inv.employeeId);

    let nextPayment: PaymentStatus | undefined;
    let nextStatus: InvestigationStatus | undefined;

    if (type === "pause_payment") {
      nextPayment = "paused";
      pushAudit({
        type: "intervention",
        title: "Payment paused",
        detail: `${inv.employeeId} — manual hold`,
        actor: "operator.console",
        refId: investigationId,
      });
    } else if (type === "approve_payment") {
      nextPayment = "approved";
      nextStatus = "closed";
      pushAudit({
        type: "intervention",
        title: "Payment approved",
        detail: `${inv.employeeId} — cleared for disbursement`,
        actor: "operator.console",
        refId: investigationId,
      });
    } else if (type === "escalate") {
      nextStatus = "escalated";
      pushAudit({
        type: "investigation",
        title: "Investigation escalated",
        detail: `${investigationId} — tier-2 queue`,
        actor: "operator.console",
        refId: investigationId,
      });
    } else if (type === "request_verification") {
      pushAudit({
        type: "verification",
        title: "Verification requested",
        detail: `${inv.employeeId} — IDV refresh`,
        actor: "operator.console",
        refId: investigationId,
      });
    }

    if (row && nextPayment) row.paymentStatus = nextPayment;
    if (nextStatus) inv.status = nextStatus;

    syncOverviewFromRows();

    return delay(200, { ok: true, message: "Action recorded" });
  },
};
