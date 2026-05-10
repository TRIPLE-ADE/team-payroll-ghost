export type RiskSeverity = "low" | "medium" | "high";

export type InvestigationStatus =
  | "open"
  | "in_review"
  | "escalated"
  | "closed";

export type PaymentStatus =
  | "scheduled"
  | "paused"
  | "approved"
  | "disbursed";

export type PayrollProcessingStatus =
  | "uploaded"
  | "analyzing"
  | "ready"
  | "locked";

export type VerificationStatus = "current" | "expiring" | "expired";

export type AnomalySensitivity = "low" | "standard" | "high";

export interface TrustPoint {
  at: string;
  score: number;
}

export interface ExplainableFactor {
  id: string;
  title: string;
  detail: string;
  confidence: number;
  evidence: string[];
  historicalNote?: string;
  peerNote?: string;
}

export interface TimelineEvent {
  id: string;
  type: string;
  summary: string;
  severity: RiskSeverity;
  detectedAt: string;
  trustAtPoint?: number;
}

export interface EmployeeProfile {
  id: string;
  name: string;
  role: string;
  department: string;
  verificationExpiresAt: string;
  verificationStatus: VerificationStatus;
  trustScore: number;
  peerGroupAvgTrust: number;
  payrollHistoryMonths: { month: string; amount: number }[];
}

/** Workforce directory row (extends profile with operational risk band). */
export interface EmployeeDirectoryEntry extends EmployeeProfile {
  riskLevel: RiskSeverity;
  lastNetPay?: number;
}

export interface Investigation {
  id: string;
  employeeId: string;
  cycleId: string;
  status: InvestigationStatus;
  openedAt: string;
  explainableFactors: ExplainableFactor[];
  timeline: TimelineEvent[];
  trustSeries: TrustPoint[];
}

export interface FlaggedQueueRow {
  employeeId: string;
  employeeName: string;
  trustScore: number;
  trustPrevious?: number;
  anomalyLabels: string[];
  attendanceNotes?: string[];
  paymentStatus: PaymentStatus;
  investigationStatus: InvestigationStatus | "none";
  investigationId?: string;
  relationshipWarning?: string;
  severity: RiskSeverity;
}

export interface PayrollCycleSummary {
  id: string;
  label: string;
  uploadedAt: string;
  totalEmployees: number;
  totalDisbursement: number;
  flaggedCount: number;
  pausedPayments: number;
  integrityScore: number;
  processingStatus: PayrollProcessingStatus;
  sourceFile?: string;
}

export interface PayrollCycleDetail extends PayrollCycleSummary {
  flaggedRows: FlaggedQueueRow[];
}

export interface IntegrityOverview {
  payrollIntegrityScore: number;
  flaggedDisbursements: number;
  activeInvestigations: number;
  pausedPayments: number;
}

export interface ThreatFeedItem {
  id: string;
  timestamp: string;
  title: string;
  severity: RiskSeverity;
  department?: string;
}

export interface DepartmentRisk {
  department: string;
  anomalyCount: number;
  trustDelta: number;
  riskLevel: RiskSeverity;
}

export interface TrendPoint {
  period: string;
  integrityScore: number;
  anomalyCount: number;
}

export type AuditEventType =
  | "payroll_upload"
  | "anomaly"
  | "intervention"
  | "investigation"
  | "verification";

export interface AuditEvent {
  id: string;
  at: string;
  type: AuditEventType;
  title: string;
  detail: string;
  actor?: string;
  refId?: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type: "employee" | "account" | "cluster";
  risk?: RiskSeverity;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
}

export type InvestigationActionType =
  | "pause_payment"
  | "approve_payment"
  | "escalate"
  | "request_verification";

export interface PaymentInterventionRow {
  id: string;
  employeeId: string;
  employeeName: string;
  cycleId: string;
  cycleLabel: string;
  state: "paused" | "released" | "escalated" | "pending";
  netAmount: number;
  updatedAt: string;
  squadRef?: string;
  history: { at: string; action: string; actor?: string }[];
}

export interface SystemSettings {
  institutionName: string;
  riskTrustFloor: number;
  anomalySensitivity: AnomalySensitivity;
  notifyReviewersEmail: boolean;
  notifyEscalationsSlack: boolean;
}
