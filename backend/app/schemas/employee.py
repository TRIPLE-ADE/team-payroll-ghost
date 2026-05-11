from pydantic import BaseModel


class PayrollHistoryMonth(BaseModel):
    month: str
    amount: float


class EmployeeProfile(BaseModel):
    id: str
    name: str
    role: str | None = None
    department: str | None = None
    verificationExpiresAt: str | None = None
    verificationStatus: str = "current"
    trustScore: int
    peerGroupAvgTrust: int
    payrollHistoryMonths: list[PayrollHistoryMonth] = []


class EmployeeDirectoryEntry(EmployeeProfile):
    riskLevel: str
    lastNetPay: float | None = None
