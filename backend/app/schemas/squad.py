from datetime import datetime
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class SquadLedgerEntry(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: str
    at: datetime
    title: str
    detail: str
    amount: int
    direction: str  # credit | debit | hold | release
    squad_ref: str | None = None
    related_cycle_id: str | None = None
    related_employee_id: str | None = None
