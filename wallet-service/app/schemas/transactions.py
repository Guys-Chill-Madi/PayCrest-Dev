
from pydantic import BaseModel
from typing import Optional

class AddMoneyRequest(BaseModel):
    amount: float

class TransactionOut(BaseModel):
    id: str
    loan_id: Optional[str]
    loan_type: Optional[str]
    type: str
    amount: float
    balance_after: float
    created_at: str
