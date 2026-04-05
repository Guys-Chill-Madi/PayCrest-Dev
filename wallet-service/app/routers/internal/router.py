"""
services/wallet-service/app/routers/internal/router.py

Internal endpoints called by payment-service and loan-service directly.
Protected by X-Internal-Token header only — NO OAuth2/JWT.
"""
from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from ...database.mongo import get_db
from ...core.config import settings

router = APIRouter(prefix="/internal", tags=["internal"])


def _try_int(value):
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


async def _get_account(db, customer_id):
    """Find bank account by customer_id (try int and str)."""
    cid_int = _try_int(customer_id)
    acc = None
    for cid in ([cid_int] if cid_int is not None else []) + [str(customer_id)]:
        acc = await db.bank_accounts.find_one({"customer_id": cid})
        if acc:
            break
    return acc


async def _next_txn_id(db) -> int:
    last = await db.transactions.find_one({}, sort=[("_id", -1)])
    try:
        return int(last.get("_id") or 0) + 1 if last else 1
    except Exception:
        return 1


class CreditPayload(BaseModel):
    customer_id: str
    amount: float
    description: str = "Wallet credit"
    reference_id: Optional[str] = None


class DebitPayload(BaseModel):
    customer_id: str
    amount: float
    description: str = "Wallet debit"
    reference_id: Optional[str] = None


def _check_token(x_internal_token: str):
    if x_internal_token != settings.INTERNAL_SERVICE_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid internal token")


@router.post("/credit")
async def credit_wallet(
    payload: CreditPayload,
    x_internal_token: str = Header(..., alias="X-Internal-Token"),
):
    """Credit a customer's wallet. Called by payment-service."""
    _check_token(x_internal_token)
    db = await get_db()
    now = datetime.utcnow()
    amt = float(payload.amount)
    cid_int = _try_int(payload.customer_id)
    cid_str = str(payload.customer_id)

    # Update bank_accounts (primary balance store)
    updated = False
    for cid in ([cid_int] if cid_int is not None else []) + [cid_str]:
        result = await db.bank_accounts.update_one(
            {"customer_id": cid},
            {"$inc": {"balance": amt}, "$set": {"updated_at": now}},
        )
        if result.matched_count > 0:
            updated = True
            break

    if not updated:
        # Auto-create account if missing
        new_id = cid_int if cid_int is not None else cid_str
        await db.bank_accounts.insert_one({
            "customer_id": new_id,
            "balance": amt,
            "created_at": now,
            "updated_at": now,
        })

    # Also update wallets table
    for cid in ([cid_int] if cid_int is not None else []) + [cid_str]:
        await db.wallets.update_one(
            {"customer_id": cid},
            {"$inc": {"balance": amt}, "$set": {"updated_at": now}},
        )

    # Record transaction
    tid = await _next_txn_id(db)
    txn = {
        "_id": tid,
        "transaction_id": tid,
        "customer_id": payload.customer_id,
        "type": "credit",
        "amount": amt,
        "description": payload.description,
        "reference_id": payload.reference_id,
        "created_at": now,
    }
    await db.transactions.insert_one(txn)

    # Get updated balance
    acc = await _get_account(db, payload.customer_id)
    new_balance = float((acc or {}).get("balance", 0))

    return {
        "success": True,
        "customer_id": payload.customer_id,
        "amount_credited": amt,
        "new_balance": new_balance,
        "transaction_id": tid,
    }


@router.post("/debit")
async def debit_wallet(
    payload: DebitPayload,
    x_internal_token: str = Header(..., alias="X-Internal-Token"),
):
    """Debit a customer's wallet. Called by loan-service for EMI payments."""
    _check_token(x_internal_token)
    db = await get_db()
    now = datetime.utcnow()
    amt = float(payload.amount)

    acc = await _get_account(db, payload.customer_id)
    if not acc:
        raise HTTPException(status_code=404, detail="Account not found")

    current_balance = float(acc.get("balance", 0))
    if current_balance < amt:
        raise HTTPException(status_code=400, detail="Insufficient balance")

    new_balance = current_balance - amt
    await db.bank_accounts.update_one(
        {"_id": acc["_id"]},
        {"$set": {"balance": new_balance, "updated_at": now}},
    )

    cid_int = _try_int(payload.customer_id)
    for cid in ([cid_int] if cid_int is not None else []) + [str(payload.customer_id)]:
        await db.wallets.update_one(
            {"customer_id": cid},
            {"$inc": {"balance": -amt}, "$set": {"updated_at": now}},
        )

    tid = await _next_txn_id(db)
    txn = {
        "_id": tid,
        "transaction_id": tid,
        "customer_id": payload.customer_id,
        "type": "debit",
        "amount": amt,
        "balance_after": new_balance,
        "description": payload.description,
        "reference_id": payload.reference_id,
        "created_at": now,
    }
    await db.transactions.insert_one(txn)

    return {
        "success": True,
        "customer_id": payload.customer_id,
        "amount_debited": amt,
        "new_balance": new_balance,
        "transaction_id": tid,
    }


@router.get("/balance/{customer_id}")
async def get_balance(
    customer_id: str,
    x_internal_token: str = Header(..., alias="X-Internal-Token"),
):
    _check_token(x_internal_token)
    db = await get_db()
    acc = await _get_account(db, customer_id)
    return {"customer_id": customer_id, "balance": float((acc or {}).get("balance", 0))}