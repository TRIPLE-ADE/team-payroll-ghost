from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class TreasuryTopUpInitiateRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    amount: int = Field(gt=0, description="Amount in whole naira")
    email: str | None = None
    customer_name: str | None = None
    callback_url: str | None = None
    payment_channels: list[str] = Field(default_factory=lambda: ["transfer"])
    pass_charge: bool = False
    metadata: dict[str, Any] | None = None


class TreasuryTopUpResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: str
    status: str
    amount: int
    currency: str
    transaction_ref: str
    checkout_url: str | None = None
    callback_url: str | None = None
    customer_email: str
    customer_name: str | None = None
    payment_channels: list[str] = Field(default_factory=list)
    pass_charge: bool = False
    virtual_account_number: str | None = None
    squad_transaction_type: str | None = None
    squad_gateway_ref: str | None = None
    squad_merchant_id: str | None = None
    metadata: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None = None


class TreasuryTopUpSimulationRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    virtual_account_number: str
    amount: int | None = Field(default=None, gt=0, description="Optional override in whole naira")


class TreasuryTopUpSimulationResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    topup: TreasuryTopUpResponse
    simulation_response: dict[str, Any]
    verification_response: dict[str, Any] | None = None
