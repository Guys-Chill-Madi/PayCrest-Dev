import time
from datetime import datetime, timedelta
from typing import Optional
import bcrypt
from jose import jwt, JWTError
from fastapi import HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from ..core.config import settings
from ..database.mongo import get_db
from bson import ObjectId
from ..utils.id import to_object_id

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_PREFIX}/auth/token")


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode(), salt).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except Exception:
        return False


def create_access_token(subject: dict, expires_minutes: int | None = None) -> str:
    expire = datetime.utcnow() + timedelta(
        minutes=expires_minutes or settings.JWT_EXPIRE_MINUTES
    )
    payload = {**subject, "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = payload.get("user_id")
    role = payload.get("role")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    db = await get_db()
    user = None
    target_is_customer = role == "customer"
    primary = db.users if target_is_customer else db.staff_users
    fallback = db.staff_users if target_is_customer else db.users

    try:
        uid = int(user_id)
        user = await primary.find_one({"_id": uid})
        if not user:
            user = await fallback.find_one({"_id": uid})
    except Exception:
        oid = to_object_id(user_id)
        user = await primary.find_one({"_id": oid})
        if not user:
            user = await fallback.find_one({"_id": oid})

    if not user or not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="User inactive or not found")
    return user


def require_roles(*allowed_roles: str):
    async def dep(user=Depends(get_current_user)):
        if user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=403, detail="Not authorized for this operation"
            )
        return user
    return dep