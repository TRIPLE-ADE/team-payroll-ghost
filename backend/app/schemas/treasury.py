from datetime import datetime
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class TreasuryWallet(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    balance_amount: int
    available_amount: int | None = None
    pending_settlement_amount: int | None = None
    virtual_account_number: str | None = None
    bank_name: str | None = None
    account_name: str | None = None
    last_synced_at: datetime
    squad_merchant_ref: str | None = None
