from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models.settings import SystemSettings
from app.schemas.settings import SystemSettings as SystemSettingsSchema
from app.schemas.settings import SystemSettingsUpdate

router = APIRouter(prefix="/api/v1/settings", tags=["settings"])


async def _get_or_create(db: AsyncSession) -> SystemSettings:
    result = await db.execute(select(SystemSettings).where(SystemSettings.id == 1))
    row = result.scalar_one_or_none()
    if not row:
        row = SystemSettings()
        db.add(row)
        await db.commit()
        await db.refresh(row)
    return row


@router.get("", response_model=SystemSettingsSchema)
async def get_settings(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    row = await _get_or_create(db)
    return SystemSettingsSchema(
        institutionName=row.institution_name,
        riskTrustFloor=row.risk_trust_floor,
        anomalySensitivity=row.anomaly_sensitivity,
        notifyReviewersEmail=row.notify_reviewers_email,
        notifyEscalationsSlack=row.notify_escalations_slack,
    )


@router.put("", response_model=SystemSettingsSchema)
async def update_settings(
    body: SystemSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    row = await _get_or_create(db)
    if body.institutionName is not None:
        row.institution_name = body.institutionName
    if body.riskTrustFloor is not None:
        row.risk_trust_floor = body.riskTrustFloor
    if body.anomalySensitivity is not None:
        row.anomaly_sensitivity = body.anomalySensitivity
    if body.notifyReviewersEmail is not None:
        row.notify_reviewers_email = body.notifyReviewersEmail
    if body.notifyEscalationsSlack is not None:
        row.notify_escalations_slack = body.notifyEscalationsSlack
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return SystemSettingsSchema(
        institutionName=row.institution_name,
        riskTrustFloor=row.risk_trust_floor,
        anomalySensitivity=row.anomaly_sensitivity,
        notifyReviewersEmail=row.notify_reviewers_email,
        notifyEscalationsSlack=row.notify_escalations_slack,
    )
