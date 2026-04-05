"""
services/admin-service/app/routers/staff/router.py

Routes must match frontend/src/lib/api/admin.ts:
- POST /admin/create-staff
- GET  /admin/users
- PUT  /admin/users/{user_id}
- DELETE /admin/users/{user_id}
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.core.security import require_roles
from app.models.enums import Roles
from app.services.admin_service import create_staff_user, list_users, set_user_status
from app.database.mongo import get_db
from app.utils.serializers import normalize_doc

router = APIRouter()


class CreateStaffPayload(BaseModel):
    full_name: str
    email: str
    password: str
    role: str = "verification"
    phone: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    employee_code: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None


class UpdateStaffPayload(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    phone: Optional[str] = None
    department: Optional[str] = None


@router.post("/create-staff")
async def create_staff(payload: CreateStaffPayload, user=Depends(require_roles(Roles.ADMIN))):
    return await create_staff_user(payload.dict(), user["_id"])


@router.get("/users")
async def list_all_users(role: Optional[str] = None, user=Depends(require_roles(Roles.ADMIN))):
    return await list_users(role=role)


@router.put("/users/{user_id}")
async def update_user(user_id: str, payload: UpdateStaffPayload, user=Depends(require_roles(Roles.ADMIN))):
    db = await get_db()
    from datetime import datetime
    from app.utils.id import loan_id_filter

    try:
        uid = int(user_id)
    except (ValueError, TypeError):
        uid = user_id

    update_data = {k: v for k, v in payload.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    if "password" in update_data:
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        update_data["password"] = pwd_context.hash(update_data["password"])

    update_data["updated_at"] = datetime.utcnow()
    result = await db.staff_users.update_one({"_id": uid}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    updated = await db.staff_users.find_one({"_id": uid}, {"password": 0})
    return normalize_doc(updated)


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, user=Depends(require_roles(Roles.ADMIN))):
    return await set_user_status(user_id, is_active=False)