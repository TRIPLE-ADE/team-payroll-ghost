import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    emp_id: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str | None] = mapped_column(String)
    department: Mapped[str | None] = mapped_column(String)
    grade_level: Mapped[str | None] = mapped_column(String)
    mda: Mapped[str | None] = mapped_column(String)

    # PII hashes
    bvn_hash: Mapped[str | None] = mapped_column(String)
    nin_hash: Mapped[str | None] = mapped_column(String)
    acct_hash: Mapped[str | None] = mapped_column(String)

    # Raw values for Squad API calls
    account_number: Mapped[str | None] = mapped_column(String)
    bank_code: Mapped[str | None] = mapped_column(String)
    bank_name: Mapped[str | None] = mapped_column(String)
    bvn: Mapped[str | None] = mapped_column(String)
    nin: Mapped[str | None] = mapped_column(String)
    dob: Mapped[str | None] = mapped_column(String)
    gender: Mapped[str | None] = mapped_column(String)
    phone: Mapped[str | None] = mapped_column(String)

    trust_score: Mapped[int] = mapped_column(Integer, default=100)
    trust_previous: Mapped[int | None] = mapped_column(Integer)
    verification_status: Mapped[str] = mapped_column(String, default="current")
    verification_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    salary: Mapped[float | None] = mapped_column(Numeric(15, 2))
    hire_date: Mapped[str | None] = mapped_column(String)
    tenure_months: Mapped[int | None] = mapped_column(Integer)
    avg_attendance_days: Mapped[float | None] = mapped_column(Numeric(5, 2))
    months_no_deduction: Mapped[int | None] = mapped_column(Integer)
    leave_days_taken: Mapped[int | None] = mapped_column(Integer)
    promotion_count: Mapped[int | None] = mapped_column(Integer)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
