from datetime import datetime

from bson import ObjectId
from fastapi import HTTPException

from ...database.mongo import get_db
from ...utils.serializers import normalize_doc

from .core import customer_match, find_wallet_doc, get_or_create_wallet, normalize_customer_id


async def credit_wallet(customer_id: str | int, amount: float, description: str = "Credit"):
    """Add money to wallet (CREDIT transaction)."""
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")

    db = await get_db()

    # Get current wallet
    wallet = await find_wallet_doc(db, customer_id)
    if not wallet:
        # Create wallet if doesn't exist
        wallet = await get_or_create_wallet(customer_id)
        wallet = await find_wallet_doc(db, customer_id)

    wallet_customer_id = wallet.get("customer_id", normalize_customer_id(customer_id))

    previous_balance = float(wallet.get("balance", 0))
    new_balance = previous_balance + amount

    # Generate transaction ID
    transaction_id = str(ObjectId())

    # Create transaction record
    transaction = {
        "transaction_id": transaction_id,
        "customer_id": wallet_customer_id,
        "type": "credit",
        "amount": amount,
        "description": description,
        "status": "success",
        "previous_balance": previous_balance,
        "new_balance": new_balance,
        "initiated_at": datetime.utcnow(),
        "completed_at": datetime.utcnow(),
    }

    await db.transactions.insert_one(transaction)

    # Update wallet
    await db.wallets.find_one_and_update(
        {"_id": wallet["_id"]},
        {
            "$set": {
                "balance": new_balance,
                "total_credited": float(wallet.get("total_credited", 0)) + amount,
                "updated_at": datetime.utcnow(),
            },
            "$inc": {"transaction_count": 1}
        },
        return_document=True
    )

    # Log audit
    from ..audit_service import write_audit_log
    await write_audit_log(
        action="wallet_credit",
        actor_id=customer_id,
        actor_role="customer",
        entity_type="wallet",
        entity_id=str(customer_id),
        details={
            "amount": amount,
            "description": description,
            "previous_balance": previous_balance,
            "new_balance": new_balance,
            "transaction_id": transaction_id,
        }
    )

    return normalize_doc(transaction)


async def debit_wallet(customer_id: str | int, amount: float, description: str = "Debit"):
    """Deduct money from wallet (DEBIT transaction)."""
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")

    db = await get_db()

    # Get current wallet
    wallet = await find_wallet_doc(db, customer_id)
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")

    wallet_customer_id = wallet.get("customer_id", normalize_customer_id(customer_id))
    previous_balance = float(wallet.get("balance", 0))

    # Check balance
    if previous_balance < amount:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance. Available: {previous_balance}, Required: {amount}"
        )

    new_balance = previous_balance - amount

    # Generate transaction ID
    transaction_id = str(ObjectId())

    # Create transaction record
    transaction = {
        "transaction_id": transaction_id,
        "customer_id": wallet_customer_id,
        "type": "debit",
        "amount": amount,
        "description": description,
        "status": "success",
        "previous_balance": previous_balance,
        "new_balance": new_balance,
        "initiated_at": datetime.utcnow(),
        "completed_at": datetime.utcnow(),
    }

    await db.transactions.insert_one(transaction)

    # Update wallet
    await db.wallets.find_one_and_update(
        {"_id": wallet["_id"]},
        {
            "$set": {
                "balance": new_balance,
                "total_debited": float(wallet.get("total_debited", 0)) + amount,
                "updated_at": datetime.utcnow(),
            },
            "$inc": {"transaction_count": 1}
        },
        return_document=True
    )

    # Log audit
    from ..audit_service import write_audit_log
    await write_audit_log(
        action="wallet_debit",
        actor_id=customer_id,
        actor_role="customer",
        entity_type="wallet",
        entity_id=str(customer_id),
        details={
            "amount": amount,
            "description": description,
            "previous_balance": previous_balance,
            "new_balance": new_balance,
            "transaction_id": transaction_id,
        }
    )

    return normalize_doc(transaction)


async def get_transaction_history(customer_id: str | int, page: int = 1, limit: int = 20):
    """Get transaction history for customer."""
    db = await get_db()

    if page < 1:
        page = 1
    if limit < 1 or limit > 100:
        limit = 20

    skip = (page - 1) * limit

    tx_filter = customer_match(customer_id)

    # Get total count
    total = await db.transactions.count_documents(tx_filter)

    # Get transactions
    transactions = await db.transactions.find(
        tx_filter
    ).sort([("initiated_at", -1), ("created_at", -1), ("completed_at", -1), ("_id", -1)]).skip(skip).limit(limit).to_list(length=limit)

    items = []
    for t in transactions:
        row = normalize_doc(t)
        if not row.get("created_at"):
            row["created_at"] = row.get("initiated_at") or row.get("completed_at") or row.get("updated_at")
        if not row.get("id"):
            row["id"] = row.get("transaction_id")
        items.append(row)

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": limit,
    }
