from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING
from pymongo.errors import OperationFailure
from ..core.config import settings

client: AsyncIOMotorClient | None = None


# ✅ Safe index creation
async def _safe_create_index(collection, keys, **kwargs):
    try:
        await collection.create_index(keys, **kwargs)
    except OperationFailure as exc:
        if getattr(exc, "code", None) == 85 and "already exists with a different name" in str(exc):
            return
        raise


# ✅ Get Mongo client
def get_client() -> AsyncIOMotorClient:
    global client
    if client is None:
        print("✅ Connecting to MongoDB at:", settings.MONGODB_URI)
        client = AsyncIOMotorClient(settings.MONGODB_URI)
    return client


# ✅ Get DB instance
async def get_db():
    return get_client()[settings.MONGODB_DB]


# ✅ Initialize indexes
async def init_indexes():
    print("🚀 Initializing MongoDB indexes...")
    db = await get_db()

    # Users
    await _safe_create_index(db.users, [("email", ASCENDING)], unique=True, name="uniq_email")
    await _safe_create_index(db.users, [("pan_number", ASCENDING)], unique=True, sparse=True, name="uniq_pan_number")

    # Staff
    await _safe_create_index(db.staff_users, [("email", ASCENDING)], unique=True, name="uniq_staff_email")
    await _safe_create_index(db.staff_users, [("role", ASCENDING)], name="staff_role_idx")

    # Bank accounts
    await _safe_create_index(db.bank_accounts, [("account_number", ASCENDING)], unique=True, name="uniq_account")

    # Loans
    await _safe_create_index(db.personal_loans, [("customer_id", ASCENDING)], name="pl_cust_idx")
    await _safe_create_index(db.vehicle_loans, [("customer_id", ASCENDING)], name="vl_cust_idx")
    await _safe_create_index(db.education_loans, [("customer_id", ASCENDING)], name="el_cust_idx")
    await _safe_create_index(db.home_loans, [("customer_id", ASCENDING)], name="hl_cust_idx")

    # Transactions
    await _safe_create_index(db.transactions, [("customer_id", ASCENDING)], name="txn_cust_idx")
    await _safe_create_index(db.transactions, [("loan_id", ASCENDING)], name="txn_loan_idx")

    # KYC
    await _safe_create_index(db.kyc_details, [("customer_id", ASCENDING)], unique=True, name="uniq_kyc_customer")
    await _safe_create_index(db.kyc_details, [("aadhaar_number", ASCENDING)], unique=True, sparse=True, name="uniq_aadhaar_number")

    # Audit logs
    await _safe_create_index(db.audit_logs, [("created_at", ASCENDING)], name="audit_created_at")
    await _safe_create_index(db.audit_logs, [("actor_id", ASCENDING)], name="audit_actor_id")
    await _safe_create_index(db.audit_logs, [("action", ASCENDING)], name="audit_action")
    await _safe_create_index(db.audit_logs, [("entity_id", ASCENDING)], name="audit_entity_id")

    # EMI
    await _safe_create_index(db.emi_schedules, [("loan_id", ASCENDING)], name="emi_loan_id")
    await _safe_create_index(db.emi_schedules, [("customer_id", ASCENDING)], name="emi_customer_id")
    await _safe_create_index(db.emi_schedules, [("due_date", ASCENDING)], name="emi_due_date")
    await _safe_create_index(db.emi_schedules, [("status", ASCENDING)], name="emi_status")

    # Escalations
    await _safe_create_index(db.emi_escalations, [("loan_id", ASCENDING)], name="esc_loan_id")
    await _safe_create_index(db.emi_escalations, [("customer_id", ASCENDING)], name="esc_customer_id")
    await _safe_create_index(db.emi_escalations, [("status", ASCENDING)], name="esc_status")
    await _safe_create_index(db.emi_escalations, [("opened_at", ASCENDING)], name="esc_opened_at")

    # Notifications
    await _safe_create_index(db.customer_notifications, [("customer_id", ASCENDING)], name="cust_note_customer_id")
    await _safe_create_index(db.customer_notifications, [("created_at", ASCENDING)], name="cust_note_created_at")
    await _safe_create_index(db.customer_notifications, [("read", ASCENDING)], name="cust_note_read")

    # Support tickets
    await _safe_create_index(db.support_tickets, [("ticket_id", ASCENDING)], unique=True, name="uniq_support_ticket_id")
    await _safe_create_index(db.support_tickets, [("customer_id", ASCENDING)], name="support_customer_id")
    await _safe_create_index(db.support_tickets, [("status", ASCENDING)], name="support_status")
    await _safe_create_index(db.support_tickets, [("created_at", ASCENDING)], name="support_created_at")

    # Cashfree
    await _safe_create_index(db.cashfree_payments, [("order_id", ASCENDING)], unique=True, name="uniq_cashfree_order_id")
    await _safe_create_index(db.cashfree_payments, [("customer_id", ASCENDING)], name="cf_customer_id")
    await _safe_create_index(db.cashfree_payments, [("loan_id", ASCENDING)], name="cf_loan_id")

    # Idempotency
    await _safe_create_index(
        db.idempotency_requests,
        [("expires_at", ASCENDING)],
        expireAfterSeconds=0,
        name="idempotency_ttl",
    )
    await _safe_create_index(
        db.idempotency_requests,
        [("method", ASCENDING), ("path", ASCENDING), ("idempotency_key", ASCENDING), ("auth_hash", ASCENDING)],
        unique=True,
        name="uniq_idempotency_request",
    )

    # 🔁 Migration (optional but safe)
    staff_roles = ["admin", "manager", "verification"]
    legacy_staff = await db.users.find({"role": {"$in": staff_roles}}).to_list(length=5000)

    for row in legacy_staff:
        email = row.get("email")
        if not email:
            continue

        await db.staff_users.update_one(
            {"email": email},
            {"$setOnInsert": row},
            upsert=True,
        )

        await db.users.delete_one({"_id": row.get("_id")})

    await db.staff_users.update_many(
        {"is_kyc_verified": {"$exists": True}},
        {"$unset": {"is_kyc_verified": ""}},
    )


# ✅ REQUIRED FOR FASTAPI (THIS WAS MISSING)

async def connect_db():
    get_client()
    await init_indexes()
    print("✅ MongoDB connected")


async def close_db():
    global client
    if client:
        client.close()
        client = None
        print("❌ MongoDB disconnected")