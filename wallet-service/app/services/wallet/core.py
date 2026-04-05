from datetime import datetime

from ...database.mongo import get_db
from ...utils.serializers import normalize_doc


def normalize_customer_id(customer_id: str | int):
    if isinstance(customer_id, str) and customer_id.isdigit():
        return int(customer_id)
    return customer_id


def customer_match(customer_id: str | int):
    normalized = normalize_customer_id(customer_id)
    variants = [normalized]
    if isinstance(normalized, int):
        variants.append(str(normalized))
    elif isinstance(normalized, str) and normalized.isdigit():
        variants.append(int(normalized))

    # de-duplicate while preserving order
    uniq: list[str | int] = []
    for v in variants:
        if v not in uniq:
            uniq.append(v)

    if len(uniq) == 1:
        return {"customer_id": uniq[0]}
    return {"customer_id": {"$in": uniq}}


async def find_wallet_doc(db, customer_id: str | int):
    wallets = await db.wallets.find(customer_match(customer_id)).to_list(length=20)
    if not wallets:
        return None

    def _sort_key(w: dict):
        updated_at = w.get("updated_at") or w.get("created_at") or datetime.min
        return (
            float(w.get("transaction_count", 0) or 0),
            float(w.get("balance", 0) or 0),
            updated_at,
        )

    wallets.sort(key=_sort_key, reverse=True)
    return wallets[0]


async def get_or_create_wallet(customer_id: str | int):
    """Get existing wallet or create new one for customer."""
    db = await get_db()

    wallet = await find_wallet_doc(db, customer_id)
    if wallet:
        return normalize_doc(wallet)

    canonical_customer_id = normalize_customer_id(customer_id)

    # Create new wallet
    new_wallet = {
        "customer_id": canonical_customer_id,
        "balance": 0.0,
        "total_credited": 0.0,
        "total_debited": 0.0,
        "transaction_count": 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = await db.wallets.insert_one(new_wallet)
    return normalize_doc({**new_wallet, "_id": result.inserted_id})


async def get_wallet_balance(customer_id: str | int):
    """Get current wallet balance."""
    db = await get_db()
    wallet = await find_wallet_doc(db, customer_id)

    if not wallet:
        return await get_or_create_wallet(customer_id)

    return normalize_doc(wallet)
