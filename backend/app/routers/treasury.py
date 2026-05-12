from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.config import settings
from app.schemas.treasury import TreasuryWallet

router = APIRouter(prefix="/api/v1/treasury", tags=["treasury"])


@router.get("/wallet", response_model=TreasuryWallet)
async def get_treasury_wallet(db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    """Squad-linked payroll float: balance and virtual account."""
    # In production, this would query actual Squad API for real balance
    # For now, return mockable defaults matching the schema
    return TreasuryWallet(
        balance_amount=48250000,  # 48.25M NGN
        available_amount=47800000,  # 47.8M NGN available
        pending_settlement_amount=450000,  # 450K NGN pending
        virtual_account_number="9988776655123",
        bank_name="Access Bank (Squad virtual)",
        account_name="GhostGuard · Payroll Float",
        last_synced_at=datetime.now(timezone.utc),
        squad_merchant_ref=f"sqd_mrch_{settings.SQUAD_MERCHANT_ID}",
    )
