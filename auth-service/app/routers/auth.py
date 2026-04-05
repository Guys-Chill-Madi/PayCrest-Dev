from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field, EmailStr
from typing import Annotated
from ..schemas.user import UserCreate, UserLogin, RegisterResponse
from ..schemas.common import TokenResponse
from ..core.security import get_current_user
from ..database.mongo import get_db
from ..services.auth_service import register_customer, login, reset_password_with_pan
from ..services.account_service import auto_create_account_for
from ..utils.serializers import normalize_doc
from ..core.security import hash_password, verify_password

router = APIRouter(tags=["auth"])


# @router.post('/register', response_model=RegisterResponse)
# async def register(payload: UserCreate):
#     """Register a new customer with email and password."""
#     user = await register_customer(payload.dict())
#     # use numeric customer_id if provided
#     cid = user.get("customer_id") or user.get("_id")
#     acc = await auto_create_account_for(cid)
#     return {
#         "customer_id": cid,
#         "account_number": acc.get("account_number"),
#         "ifsc": acc.get("ifsc_code"),
#         "balance": acc.get("balance"),
#     }

@router.post('/register', response_model=RegisterResponse)
async def register(payload: UserCreate):
    user = await register_customer(payload.dict())

    cid = user.get("customer_id") or user.get("_id")

    acc = await auto_create_account_for(cid)

    if not acc:
        print(acc)
        raise HTTPException(status_code=500, detail="Account creation failed")
        

    return {
        "customer_id": str(cid),
        "account_number": str(acc.get("account_number") or ""),
        "ifsc": str(acc.get("ifsc_code") or acc.get("ifsc") or ""),
        "balance": float(acc.get("balance") or 0),
        "full_name": user.get("full_name") or user.get("name"),
    }

@router.post('/token', response_model=TokenResponse)
async def login_for_access_token(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    """OAuth2 compatible login endpoint.
    
    Use the 'username' field to provide email address.
    This endpoint is used by Swagger's Authorize button and other OAuth2 clients.
    
    - **username**: Your email address
    - **password**: Your password
    """
    # Treat username as email
    email = form_data.username
    password = form_data.password
    
    token = await login(email, password)
    return token


class MyProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    phone: str | None = Field(default=None, max_length=20)
    address: str | None = Field(default=None, max_length=300)
    city: str | None = Field(default=None, max_length=80)
    state: str | None = Field(default=None, max_length=80)
    country: str | None = Field(default=None, max_length=80)
    department: str | None = Field(default=None, max_length=120)
    designation: str | None = Field(default=None, max_length=120)
    employee_code: str | None = Field(default=None, max_length=40)


class PasswordChangePayload(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)


class ForgotPasswordPanPayload(BaseModel):
    email: EmailStr
    pan_number: str = Field(..., pattern=r"^[A-Za-z]{5}[0-9]{4}[A-Za-z]$")
    new_password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)


@router.get("/me")
async def get_my_profile(user=Depends(get_current_user)):
    out = normalize_doc(user)
    out.pop("password", None)
    return out


@router.put("/me")
async def update_my_profile(payload: MyProfileUpdate, user=Depends(get_current_user)):
    db = await get_db()
    role = str(user.get("role") or "").lower().strip()
    collection = db.users if role == "customer" else db.staff_users

    update = {k: v.strip() if isinstance(v, str) else v for k, v in payload.dict(exclude_unset=True).items()}
    update["updated_at"] = datetime.utcnow()

    await collection.update_one({"_id": user["_id"]}, {"$set": update})
    updated = await collection.find_one({"_id": user["_id"]})
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")

    out = normalize_doc(updated)
    out.pop("password", None)
    return out


@router.put("/me/password")
async def change_my_password(payload: PasswordChangePayload, user=Depends(get_current_user)):
    if payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="New password and confirmation do not match")

    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=400, detail="New password must be different from current password")

    db = await get_db()
    role = str(user.get("role") or "").lower().strip()
    collection = db.users if role == "customer" else db.staff_users

    stored_hash = str(user.get("password") or "")
    if not verify_password(payload.current_password, stored_hash):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    await collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"password": hash_password(payload.new_password), "updated_at": datetime.utcnow()}},
    )

    return {"message": "Password updated successfully"}


@router.post("/forgot-password/pan")
async def forgot_password_with_pan(payload: ForgotPasswordPanPayload):
    return await reset_password_with_pan(
        payload.email,
        payload.pan_number,
        payload.new_password,
        payload.confirm_password,
    )
