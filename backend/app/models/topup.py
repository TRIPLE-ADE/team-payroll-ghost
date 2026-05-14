import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class TreasuryTopUp(Base):
    __tablename__ = "treasury_topups"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    initiated_by: Mapped[str | None] = mapped_column(String)
    customer_email: Mapped[str] = mapped_column(String, nullable=False)
    customer_name: Mapped[str | None] = mapped_column(String)
    amount_kobo: Mapped[int] = mapped_column(Integer, nullable=False)
    settled_amount_kobo: Mapped[int | None] = mapped_column(Integer)
    currency: Mapped[str] = mapped_column(String, default="NGN")
    status: Mapped[str] = mapped_column(String, default="initiated", index=True)
    transaction_ref: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
    checkout_url: Mapped[str | None] = mapped_column(String)
    callback_url: Mapped[str | None] = mapped_column(String)
    payment_channels: Mapped[list | None] = mapped_column(JSONB)
    pass_charge: Mapped[bool] = mapped_column(Boolean, default=False)
    metadata_json: Mapped[dict | None] = mapped_column(JSONB)
    virtual_account_number: Mapped[str | None] = mapped_column(String)
    squad_transaction_type: Mapped[str | None] = mapped_column(String)
    squad_gateway_ref: Mapped[str | None] = mapped_column(String)
    squad_merchant_id: Mapped[str | None] = mapped_column(String)
    checkout_payload: Mapped[dict | None] = mapped_column(JSONB)
    verify_payload: Mapped[dict | None] = mapped_column(JSONB)
    webhook_payload: Mapped[dict | None] = mapped_column(JSONB)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
