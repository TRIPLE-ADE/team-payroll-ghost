import uuid
from datetime import datetime

from sqlalchemy import ARRAY, DateTime, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PayrollCycle(Base):
    __tablename__ = "payroll_cycles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    label: Mapped[str] = mapped_column(String, nullable=False)
    source_file: Mapped[str | None] = mapped_column(String)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    processing_status: Mapped[str] = mapped_column(String, default="uploaded")
    total_employees: Mapped[int] = mapped_column(Integer, default=0)
    total_disbursement: Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    flagged_count: Mapped[int] = mapped_column(Integer, default=0)
    paused_payments: Mapped[int] = mapped_column(Integer, default=0)
    integrity_score: Mapped[int] = mapped_column(Integer, default=0)


class PayrollHistory(Base):
    __tablename__ = "payroll_history"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    cycle_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    month_label: Mapped[str | None] = mapped_column(String)
    net_amount: Mapped[float | None] = mapped_column(Numeric(15, 2))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class FlaggedRow(Base):
    __tablename__ = "flagged_rows"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cycle_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    trust_score: Mapped[int | None] = mapped_column(Integer)
    trust_previous: Mapped[int | None] = mapped_column(Integer)
    anomaly_labels: Mapped[list | None] = mapped_column(ARRAY(Text))
    attendance_notes: Mapped[list | None] = mapped_column(ARRAY(Text))
    payment_status: Mapped[str] = mapped_column(String, default="scheduled")
    investigation_status: Mapped[str] = mapped_column(String, default="none")
    investigation_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    relationship_warning: Mapped[str | None] = mapped_column(String)
    severity: Mapped[str | None] = mapped_column(String)
    ml_score: Mapped[float | None] = mapped_column(Numeric(5, 2))
    final_score: Mapped[float | None] = mapped_column(Numeric(5, 2))
    recommended_action: Mapped[str | None] = mapped_column(String)
    raw_flags: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
