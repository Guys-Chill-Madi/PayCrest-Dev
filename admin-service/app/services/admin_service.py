"""
services/admin-service/app/services/admin_service.py

Complete service file with ALL functions imported by:
- routers/approvals/router.py
- routers/staff/router.py
"""
from datetime import datetime, timedelta
from fastapi import HTTPException
from ..database.mongo import get_db
from ..models.enums import LoanStatus
from ..utils.serializers import normalize_doc


# ── Pan masking ───────────────────────────────────────────────────────────────

def _mask_pan(value: str | None) -> str | None:
    pan = str(value or "").strip().upper()
    if not pan:
        return None
    if len(pan) != 10:
        return pan
    return f"{pan[:2]}******{pan[-2:]}"


def _sanitize_loan_doc(doc: dict) -> dict:
    out = normalize_doc(doc)
    if not out.get("pan_masked"):
        out["pan_masked"] = _mask_pan(out.get("pan_number"))
    if not out.get("guarantor_pan_masked"):
        out["guarantor_pan_masked"] = _mask_pan(out.get("guarantor_pan"))
    out.pop("pan_number", None)
    out.pop("guarantor_pan", None)
    out.pop("pan_hash", None)
    out.pop("guarantor_pan_hash", None)
    return out


# ── Loan queue constants ──────────────────────────────────────────────────────

ADMIN_QUEUE_STATUSES = [
    LoanStatus.PENDING_ADMIN_APPROVAL,
    LoanStatus.MANAGER_APPROVED,
    LoanStatus.ADMIN_APPROVED,
    LoanStatus.SANCTION_SENT,
    LoanStatus.SIGNED_RECEIVED,
    LoanStatus.READY_FOR_DISBURSEMENT,
    "verified",
    "assigned_to_verification",
    "pending_verification",
    "verification_done",
]

COLLECTIONS = ["personal_loans", "vehicle_loans", "education_loans", "home_loans"]


# ── Loan finders ──────────────────────────────────────────────────────────────

async def find_loan_any(loan_id: str):
    """Find a loan across all collections. Returns (collection_name, loan) or (None, None)."""
    db = await get_db()
    # Try numeric ID first
    try:
        lid_int = int(loan_id)
    except (ValueError, TypeError):
        lid_int = None

    for col_name in COLLECTIONS:
        # Try string match
        loan = await db[col_name].find_one({"loan_id": loan_id})
        if loan:
            return col_name, loan
        # Try int match
        if lid_int is not None:
            loan = await db[col_name].find_one({"loan_id": lid_int})
            if loan:
                return col_name, loan
        # Try ObjectId/_id
        try:
            from bson import ObjectId
            loan = await db[col_name].find_one({"_id": ObjectId(loan_id)})
            if loan:
                return col_name, loan
        except Exception:
            pass
    return None, None


# ── Dashboard queries ─────────────────────────────────────────────────────────

async def list_pending_admin_approvals() -> list:
    db = await get_db()
    loans = []
    for col in COLLECTIONS:
        loans += await db[col].find(
            {"status": {"$in": ADMIN_QUEUE_STATUSES}}
        ).sort("applied_at", -1).to_list(length=200)
    return [_sanitize_loan_doc(l) for l in loans]


async def get_admin_approvals_dashboard(days: int = 30) -> dict:
    db = await get_db()
    cutoff = datetime.utcnow() - timedelta(days=int(days or 30))

    pending = []
    for col in COLLECTIONS:
        pending += await db[col].find(
            {"status": {"$in": ADMIN_QUEUE_STATUSES}}
        ).sort("applied_at", -1).to_list(length=200)

    processed_statuses = [
        LoanStatus.ACTIVE, LoanStatus.COMPLETED,
        LoanStatus.FORECLOSED, LoanStatus.REJECTED, LoanStatus.DISBURSED,
    ]
    processed = []
    for col in COLLECTIONS:
        processed += await db[col].find({
            "status": {"$in": processed_statuses},
            "applied_at": {"$gte": cutoff},
        }).sort("applied_at", -1).to_list(length=200)

    return {
        "pending_approvals": [_sanitize_loan_doc(l) for l in pending],
        "processed_approvals": [_sanitize_loan_doc(l) for l in processed],
        "cutoff_days": int(days or 30),
    }


async def list_high_value_pending() -> list:
    db = await get_db()
    loans = []
    for col in COLLECTIONS:
        loans += await db[col].find({
            "status": {"$in": ADMIN_QUEUE_STATUSES},
            "loan_amount": {"$gt": 1500000},
        }).to_list(length=200)
    return [_sanitize_loan_doc(l) for l in loans]


async def list_ready_for_disbursement() -> list:
    db = await get_db()
    loans = []
    for col in COLLECTIONS:
        loans += await db[col].find(
            {"status": LoanStatus.READY_FOR_DISBURSEMENT}
        ).to_list(length=200)
    return [_sanitize_loan_doc(l) for l in loans]


# ── Staff management ──────────────────────────────────────────────────────────

async def create_staff_user(payload: dict, created_by) -> dict:
    db = await get_db()
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    email = str(payload.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    existing = await db.staff_users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=409, detail="Staff user already exists")

    last = await db.staff_users.find_one({}, sort=[("_id", -1)])
    try:
        new_id = int(last.get("_id") or 0) + 1 if last else 100
    except Exception:
        new_id = 100

    hashed = pwd_context.hash(str(payload.get("password") or "changeme123"))
    doc = {
        "_id": new_id,
        "full_name": payload.get("full_name") or payload.get("name") or "",
        "email": email,
        "phone": payload.get("phone") or "",
        "role": payload.get("role") or "verification",
        "password": hashed,
        "is_active": True,
        "created_by": str(created_by),
        "created_at": datetime.utcnow(),
    }
    await db.staff_users.insert_one(doc)
    doc.pop("password", None)
    return normalize_doc(doc)


async def list_users(role: str | None = None) -> list:
    db = await get_db()
    query: dict = {}
    if role:
        query["role"] = role
    users = await db.staff_users.find(query, {"password": 0}).sort("full_name", 1).to_list(length=500)
    return [normalize_doc(u) for u in users]


async def set_user_status(user_id, is_active: bool) -> dict:
    db = await get_db()
    try:
        uid = int(user_id)
    except (ValueError, TypeError):
        uid = user_id
    result = await db.staff_users.update_one(
        {"_id": uid},
        {"$set": {"is_active": is_active, "updated_at": datetime.utcnow()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    user = await db.staff_users.find_one({"_id": uid}, {"password": 0})
    return normalize_doc(user)


# ── Manager-facing helpers (kept for backward compat) ─────────────────────────

async def get_loans_for_manager():
    db = await get_db()
    manager_statuses = [
        LoanStatus.APPLIED,
        LoanStatus.ASSIGNED_TO_VERIFICATION,
        LoanStatus.VERIFICATION_DONE,
        LoanStatus.MANAGER_APPROVED,
        LoanStatus.PENDING_ADMIN_APPROVAL,
        LoanStatus.ADMIN_APPROVED,
        LoanStatus.SANCTION_SENT,
        LoanStatus.SIGNED_RECEIVED,
        LoanStatus.READY_FOR_DISBURSEMENT,
        LoanStatus.ACTIVE,
        LoanStatus.COMPLETED,
        LoanStatus.FORECLOSED,
        LoanStatus.DISBURSED,
        LoanStatus.REJECTED,
        "verified",
        "verification_rejected",
        "assigned_to_verification",
        "pending_admin_approval",
    ]
    loans = []
    for col in COLLECTIONS:
        loans += await db[col].find(
            {"status": {"$in": manager_statuses}}
        ).sort("applied_at", -1).to_list(length=400)
    return [_sanitize_loan_doc(l) for l in loans]


async def list_verification_team(active_only: bool = True):
    db = await get_db()
    query: dict = {"role": "verification"}
    if active_only:
        query["is_active"] = True
    members = await db.staff_users.find(query, {"password": 0}).sort("full_name", 1).to_list(length=300)
    return [normalize_doc(m) for m in members]