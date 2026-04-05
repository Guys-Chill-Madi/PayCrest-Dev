
from pydantic import BaseModel, Field, EmailStr,validator
from typing import Optional
from datetime import date


class UserCreate(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)
    phone: Optional[str] = Field(None,max_length=10, pattern=r"^\d{10}$")

    dob: Optional[date] = None
    gender: Optional[str] = Field(None, pattern=r"(?i)^(male|female|other)$")
    pan_number: Optional[str] = Field(None, pattern=r"^[A-Z]{5}[0-9]{4}[A-Z]$")

    @validator("pan_number", pre=True)
    def uppercase_pan(cls, v):
        return v.upper() if v else v
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str = Field(alias="_id")
    full_name: str
    email: EmailStr
    role: str = Field(
        ...,
        pattern=r"(?i)^(customer|admin|manager|verifier)$"
    )
    is_active: bool
    is_kyc_verified: bool


class RegisterResponse(BaseModel):
    customer_id: str
    account_number: str
    ifsc: str
    balance: float
    full_name: str | None = None
