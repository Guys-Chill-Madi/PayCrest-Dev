from datetime import datetime, timedelta, timezone

from fastapi import HTTPException

from ...core.security import hash_password, verify_password
from ...database.mongo import get_db

MPIN_LOCKOUT_MINUTES = 5


async def setup_mpin(customer_id: str | int, mpin: str, confirm_mpin: str):
    """Set up M-PIN for customer."""
    if mpin != confirm_mpin:
        raise HTTPException(status_code=400, detail="M-PINs do not match")

    if not mpin.isdigit() or len(mpin) != 4:
        raise HTTPException(status_code=400, detail="M-PIN must be exactly 4 digits")

    db = await get_db()

    # Check if M-PIN already set
    user = await db.users.find_one({"_id": customer_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.get("mpin_hash"):
        raise HTTPException(status_code=400, detail="M-PIN already set")

    # Hash and store M-PIN
    mpin_hash = hash_password(mpin)

    await db.users.update_one(
        {"_id": customer_id},
        {
            "$set": {
                "mpin_hash": mpin_hash,
                "mpin_failed_attempts": 0,
                "mpin_locked_until": None,
                "mpin_created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }
        }
    )

    # Log audit
    from ..audit_service import write_audit_log
    await write_audit_log(
        action="mpin_setup",
        actor_id=customer_id,
        actor_role="customer",
        entity_type="user",
        entity_id=str(customer_id),
        details={"message": "M-PIN setup completed"}
    )

    return {"success": True, "message": "M-PIN set up successfully"}


async def verify_mpin(customer_id: str | int, mpin: str, max_attempts: int = 3):
    """Verify M-PIN for customer."""
    db = await get_db()

    user = await db.users.find_one({"_id": customer_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.get("mpin_hash"):
        raise HTTPException(status_code=400, detail="M-PIN not set up yet")

    now = datetime.utcnow()

    locked_until = user.get("mpin_locked_until")
    if locked_until:
        try:
            # If stored as string, tolerate best-effort parsing.
            if isinstance(locked_until, str):
                locked_until = datetime.fromisoformat(locked_until.replace("Z", "+00:00"))
            if isinstance(locked_until, datetime) and locked_until.tzinfo is not None:
                locked_until = locked_until.astimezone(timezone.utc).replace(tzinfo=None)
        except Exception:
            locked_until = None

    if locked_until and locked_until > now:
        remaining = int((locked_until - now).total_seconds())
        remaining_minutes = max(1, (remaining + 59) // 60)
        raise HTTPException(
            status_code=429,
            detail=f"Too many failed attempts. M-PIN is locked. Try again in {remaining_minutes} minute(s).",
        )

    # Lock expired: clear lock + reset attempts (best-effort).
    if locked_until and locked_until <= now:
        try:
            await db.users.update_one(
                {"_id": customer_id},
                {"$set": {"mpin_failed_attempts": 0, "mpin_locked_until": None}},
            )
        except Exception:
            pass
        user["mpin_failed_attempts"] = 0
        user["mpin_locked_until"] = None

    # Get attempt count from cache (using a simple field for now)
    attempt_count = int(user.get("mpin_failed_attempts", 0) or 0)

    # Backward compatibility: if attempts hit the limit but lock wasn't stored, lock now.
    if attempt_count >= int(max_attempts) and not locked_until:
        locked_until = now + timedelta(minutes=MPIN_LOCKOUT_MINUTES)
        await db.users.update_one(
            {"_id": customer_id},
            {"$set": {"mpin_locked_until": locked_until}},
        )
        raise HTTPException(
            status_code=429,
            detail=f"Too many failed attempts. M-PIN locked for {MPIN_LOCKOUT_MINUTES} minutes.",
        )

    # Verify M-PIN
    if not verify_password(mpin, user["mpin_hash"]):
        next_attempts = attempt_count + 1
        if next_attempts >= int(max_attempts):
            locked_until = now + timedelta(minutes=MPIN_LOCKOUT_MINUTES)
            await db.users.update_one(
                {"_id": customer_id},
                {"$set": {"mpin_failed_attempts": next_attempts, "mpin_locked_until": locked_until}},
            )
            raise HTTPException(
                status_code=429,
                detail=f"Too many failed attempts. M-PIN locked for {MPIN_LOCKOUT_MINUTES} minutes.",
            )

        # Increment failed attempts (not yet locked)
        await db.users.update_one(
            {"_id": customer_id},
            {"$set": {"mpin_failed_attempts": next_attempts}},
        )
        raise HTTPException(status_code=401, detail="Incorrect M-PIN")

    # Reset failed attempts on success
    await db.users.update_one(
        {"_id": customer_id},
        {
            "$set": {
                "mpin_failed_attempts": 0,
                "mpin_locked_until": None,
                "mpin_last_verified_at": datetime.utcnow(),
            }
        }
    )

    # Log audit
    from ..audit_service import write_audit_log
    await write_audit_log(
        action="mpin_verified",
        actor_id=customer_id,
        actor_role="customer",
        entity_type="user",
        entity_id=str(customer_id),
        details={"message": "M-PIN verification successful"}
    )

    return {"success": True, "message": "M-PIN verified"}


async def reset_mpin(customer_id: str | int, old_mpin: str, new_mpin: str, confirm_mpin: str):
    """Reset M-PIN for customer."""
    db = await get_db()

    user = await db.users.find_one({"_id": customer_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.get("mpin_hash"):
        raise HTTPException(status_code=400, detail="M-PIN not set up yet")

    # Verify old M-PIN
    if not verify_password(old_mpin, user["mpin_hash"]):
        raise HTTPException(status_code=401, detail="Current M-PIN is incorrect")

    if new_mpin != confirm_mpin:
        raise HTTPException(status_code=400, detail="New M-PINs do not match")

    if not new_mpin.isdigit() or len(new_mpin) != 4:
        raise HTTPException(status_code=400, detail="M-PIN must be exactly 4 digits")

    # Hash and update
    new_mpin_hash = hash_password(new_mpin)

    await db.users.update_one(
        {"_id": customer_id},
        {
            "$set": {
                "mpin_hash": new_mpin_hash,
                "mpin_failed_attempts": 0,
                "mpin_locked_until": None,
                "updated_at": datetime.utcnow(),
            }
        }
    )

    # Log audit
    from ..audit_service import write_audit_log
    await write_audit_log(
        action="mpin_reset",
        actor_id=customer_id,
        actor_role="customer",
        entity_type="user",
        entity_id=str(customer_id),
        details={"message": "M-PIN reset successfully"}
    )

    return {"success": True, "message": "M-PIN updated successfully"}


async def reset_mpin_with_password(
    customer_id: str | int,
    password: str,
    new_mpin: str,
    confirm_mpin: str,
):
    """Reset M-PIN for customer after verifying account password."""
    db = await get_db()

    user = await db.users.find_one({"_id": customer_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.get("mpin_hash"):
        raise HTTPException(status_code=400, detail="M-PIN not set up yet")

    if not verify_password(password, user.get("password", "")):
        raise HTTPException(status_code=401, detail="Invalid password")

    if new_mpin != confirm_mpin:
        raise HTTPException(status_code=400, detail="New M-PINs do not match")

    if not new_mpin.isdigit() or len(new_mpin) != 4:
        raise HTTPException(status_code=400, detail="M-PIN must be exactly 4 digits")

    new_mpin_hash = hash_password(new_mpin)

    await db.users.update_one(
        {"_id": customer_id},
        {
            "$set": {
                "mpin_hash": new_mpin_hash,
                "mpin_failed_attempts": 0,
                "mpin_locked_until": None,
                "updated_at": datetime.utcnow(),
            }
        },
    )

    from ..audit_service import write_audit_log
    await write_audit_log(
        action="mpin_reset_password",
        actor_id=customer_id,
        actor_role="customer",
        entity_type="user",
        entity_id=str(customer_id),
        details={"message": "M-PIN reset successfully (password verified)"},
    )

    return {"success": True, "message": "M-PIN updated successfully"}


async def get_mpin_status(customer_id: str | int):
    """Return whether the customer has an M-PIN configured."""
    db = await get_db()
    user = await db.users.find_one({"_id": customer_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"mpin_set": bool(user.get("mpin_hash"))}

