from pydantic import BaseModel


class PaymentHistoryEntry(BaseModel):
    at: str
    action: str
    actor: str | None = None


class PaymentInterventionRow(BaseModel):
    id: str
    employeeId: str
    employeeName: str
    cycleId: str
    cycleLabel: str
    state: str  # pending | paused | released | escalated
    netAmount: float
    updatedAt: str
    squadRef: str | None = None
    history: list[PaymentHistoryEntry] = []
