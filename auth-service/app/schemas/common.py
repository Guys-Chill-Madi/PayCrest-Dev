
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: str
    mpin_set: bool = False

class Message(BaseModel):
    detail: str
