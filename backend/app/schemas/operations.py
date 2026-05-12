from datetime import datetime
from pydantic import BaseModel


class LiquidityStats(BaseModel):
    paused_payments_total_amount: int
    scheduled_payroll_total_amount: int
    held_count: int
    as_of: datetime


class QueueStats(BaseModel):
    open_flags_count: int
    open_investigations_count: int
    oldest_open_investigation_age_hours: float
    paused_amount_on_hold: int
