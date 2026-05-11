from pydantic import BaseModel


class SystemSettings(BaseModel):
    institutionName: str
    riskTrustFloor: int
    anomalySensitivity: str
    notifyReviewersEmail: bool
    notifyEscalationsSlack: bool


class SystemSettingsUpdate(BaseModel):
    institutionName: str | None = None
    riskTrustFloor: int | None = None
    anomalySensitivity: str | None = None
    notifyReviewersEmail: bool | None = None
    notifyEscalationsSlack: bool | None = None
