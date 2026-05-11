from sqlalchemy import Boolean, CheckConstraint, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SystemSettings(Base):
    __tablename__ = "system_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    institution_name: Mapped[str] = mapped_column(String, default="GhostBuster")
    risk_trust_floor: Mapped[int] = mapped_column(Integer, default=55)
    anomaly_sensitivity: Mapped[str] = mapped_column(String, default="standard")
    notify_reviewers_email: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_escalations_slack: Mapped[bool] = mapped_column(Boolean, default=False)

    __table_args__ = (CheckConstraint("id = 1", name="single_row"),)
