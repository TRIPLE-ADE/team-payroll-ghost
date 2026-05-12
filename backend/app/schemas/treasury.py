from datetime import datetime
from pydantic import BaseModel


class TreasuryWallet(BaseModel):
    balance_amount: int
    available_amount: int
    pending_settlement_amount: int
    virtual_account_number: str
    bank_name: str
    account_name: str
    last_synced_at: datetime
    squad_merchant_ref: str | None = None
