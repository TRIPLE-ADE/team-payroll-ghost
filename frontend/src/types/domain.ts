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

/** Nigerian Naira only for now — all monetary fields use whole naira unless stated otherwise. */
export const APP_CURRENCY_CODE = "NGN" as const;

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

/** Dashboard strip; same shape as payroll cycle list rows (NGN amounts). */
export type PayrollCycleBrief = PayrollCycleSummary;

export interface TreasuryWallet {
  balanceAmount: number;
  availableAmount: number;
  pendingSettlementAmount: number;
  virtualAccountNumber: string;
  bankName: string;
  accountName: string;
  lastSyncedAt: string;
  squadMerchantRef?: string;
}

export interface TreasuryTopupInitiateRequest {
  amount: number;
  email: string;
  customerName: string;
  callbackUrl: string;
  paymentChannels: string[];
  passCharge: boolean;
  metadata: Record<string, unknown>;
}

export interface TreasuryTopupInitiateResponse {
  id: string;
  status: string;
  amount: number;
  currency: string;
  transactionRef: string;
  checkoutUrl: string;
  callbackUrl: string;
  customerEmail: string;
  customerName: string;
  paymentChannels: string[];
  passCharge: boolean;
  virtualAccountNumber?: string;
  squadTransactionType?: string;
  squadGatewayRef?: string;
  squadMerchantId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export interface LiquiditySnapshot {
  pausedPaymentsTotalAmount: number;
  scheduledPayrollTotalAmount: number;
  heldCount: number;
  asOf: string;
}

export type SquadLedgerDirection = "credit" | "debit" | "hold" | "release";

export interface SquadLedgerEntry {
  id: string;
  at: string;
  title: string;
  detail?: string;
  amount?: number;
  direction: SquadLedgerDirection;
  squadRef?: string;
  relatedCycleId?: string;
  relatedEmployeeId?: string;
}

export interface OperationalQueueStats {
  openFlagsCount: number;
  openInvestigationsCount: number;
  oldestOpenInvestigationAgeHours: number;
  pausedAmountOnHold: number;
}
