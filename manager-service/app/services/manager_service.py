from ..database.mongo import get_db
from ..models.enums import LoanStatus
from ..utils.serializers import normalize_doc


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
        # String statuses set by verification-service
        "verified",
        "verification_rejected",
        "assigned_to_verification",
        "pending_admin_approval",
    ]
    loans = []
    for col in ["personal_loans", "vehicle_loans", "education_loans", "home_loans"]:
        loans += await db[col].find(
            {"status": {"$in": manager_statuses}}
        ).sort("applied_at", -1).to_list(length=400)
    return [_sanitize_loan_doc(l) for l in loans]


async def list_pending_signature_verifications():
    db = await get_db()
    loans = []
    for col in ["personal_loans", "vehicle_loans", "education_loans", "home_loans"]:
        loans += await db[col].find({"status": LoanStatus.SIGNED_RECEIVED}).to_list(length=200)
    return [_sanitize_loan_doc(l) for l in loans]


async def list_verification_team(active_only: bool = True):
    db = await get_db()
    query: dict = {"role": "verification"}
    if active_only:
        query["is_active"] = True
    members = await db.staff_users.find(query, {"password": 0}).sort("full_name", 1).to_list(length=300)
    return [normalize_doc(m) for m in members]