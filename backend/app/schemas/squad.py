from datetime import datetime
from pydantic import BaseModel


class SquadLedgerEntry(BaseModel):
    id: str
    at: datetime
    title: str
    detail: str
    amount: int
    direction: str  # credit | debit | hold | release
    squad_ref: str | None = None
    related_cycle_id: str | None = None
    related_employee_id: str | None = None
