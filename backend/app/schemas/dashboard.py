from pydantic import BaseModel


class IntegrityOverview(BaseModel):
    payrollIntegrityScore: int
    flaggedDisbursements: int
    activeInvestigations: int
    pausedPayments: int


class ThreatFeedItem(BaseModel):
    id: str
    timestamp: str
    title: str
    severity: str
    department: str | None = None


class DepartmentRisk(BaseModel):
    department: str
    anomalyCount: int
    trustDelta: int
    riskLevel: str


class TrendPoint(BaseModel):
    period: str
    integrityScore: int
    anomalyCount: int
