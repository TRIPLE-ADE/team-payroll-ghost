from pydantic import BaseModel

from app.schemas.employee import EmployeeProfile


class ExplainableFactor(BaseModel):
    id: str
    title: str
    detail: str
    confidence: int
    evidence: list[str] = []
    historicalNote: str | None = None
    peerNote: str | None = None


class TimelineEvent(BaseModel):
    id: str
    type: str
    summary: str
    severity: str
    detectedAt: str
    trustAtPoint: int | None = None


class TrustPoint(BaseModel):
    at: str
    score: int


class Investigation(BaseModel):
    id: str
    employeeId: str
    cycleId: str
    status: str
    openedAt: str
    explainableFactors: list[ExplainableFactor] = []
    timeline: list[TimelineEvent] = []
    trustSeries: list[TrustPoint] = []


class InvestigationDetail(BaseModel):
    investigation: Investigation
    employee: EmployeeProfile


class InvestigationActionRequest(BaseModel):
    type: str  # pause_payment | approve_payment | escalate | request_verification


class ActionResponse(BaseModel):
    ok: bool
    message: str
