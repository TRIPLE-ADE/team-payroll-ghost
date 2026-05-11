from pydantic import BaseModel


class FlaggedQueueRow(BaseModel):
    employeeId: str
    employeeName: str
    trustScore: int
    trustPrevious: int | None = None
    anomalyLabels: list[str] = []
    attendanceNotes: list[str] | None = None
    paymentStatus: str
    investigationStatus: str
    investigationId: str | None = None
    relationshipWarning: str | None = None
    severity: str


class PayrollCycleSummary(BaseModel):
    id: str
    label: str
    uploadedAt: str
    totalEmployees: int
    totalDisbursement: float
    flaggedCount: int
    pausedPayments: int
    integrityScore: int
    processingStatus: str
    sourceFile: str | None = None


class PayrollCycleDetail(PayrollCycleSummary):
    flaggedRows: list[FlaggedQueueRow] = []


class UploadResponse(BaseModel):
    id: str


class AnalyzeResponse(BaseModel):
    ok: bool
    message: str
