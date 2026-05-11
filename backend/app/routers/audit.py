from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models.audit import AuditEvent

router = APIRouter(prefix="/api/v1/audit", tags=["audit"])


@router.get("/events")
async def get_audit_events(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(AuditEvent).order_by(AuditEvent.at.desc()).limit(100)
    )
    events = result.scalars().all()
    return [
        {
            "id": str(e.id),
            "at": e.at.isoformat(),
            "type": e.type,
            "title": e.title,
            "detail": e.detail,
            "actor": e.actor,
            "refId": e.ref_id,
        }
        for e in events
    ]
