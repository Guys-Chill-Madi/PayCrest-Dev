"""
wallet-service/app/routers/internal/router.py
Internal endpoints called by other microservices directly.
Protected by X-Internal-Token header only — NO OAuth2/JWT.
"""
import time
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from ...core.config import settings
from ...database.mongo import get_db

router = APIRouter(prefix="/internal", tags=["internal"])


def _try_int(value):
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def _check_token(x_internal_token: str):
    if x_internal_token != settings.INTERNAL_SERVICE_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid internal token")


async def _get_account(db, customer_id):
    cid_int = _try_int(customer_id)
    for cid in ([cid_int] if cid_int is not None else []) + [str(customer_id)]:
        acc = await db.bank_accounts.find_one({"customer_id": cid})
        if acc:
            return acc
    return None


async def _next_txn_id(db) -> int:
    try:
        cursor = db.transactions.find(
            {"_id": {"$type": ["int", "long", "double"]}},
            sort=[("_id", -1)],
            limit=1,
        )
        async for doc in cursor:
            raw = doc.get("_id")
            try:
                return int(raw) + 1
            except (TypeError, ValueError):
                pass
    except Exception:
        pass
    return int(time.time() * 1000) % 2_000_000_000


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


class MpinVerifyPayload(BaseModel):
    customer_id: str
    mpin: str


@router.post("/credit")
async def credit_wallet(
    payload: CreditPayload,
    x_internal_token: str = Header(..., alias="X-Internal-Token"),
):
    _check_token(x_internal_token)
    db = await get_db()
    now = datetime.utcnow()
    amt = float(payload.amount)
    cid_int = _try_int(payload.customer_id)
    cid_str = str(payload.customer_id)
    candidates = ([cid_int] if cid_int is not None else []) + [cid_str]

    updated = False
    for cid in candidates:
        result = await db.bank_accounts.update_one(
            {"customer_id": cid},
            {"$inc": {"balance": amt}, "$set": {"updated_at": now}},
        )
        if result.matched_count > 0:
            updated = True
            break

    if not updated:
        new_id = cid_int if cid_int is not None else cid_str
        await db.bank_accounts.insert_one({
            "customer_id": new_id,
            "balance": amt,
            "created_at": now,
            "updated_at": now,
        })

    wallet_updated = False
    for cid in candidates:
        result = await db.wallets.update_one(
            {"customer_id": cid},
            {
                "$inc": {"balance": amt, "total_credited": amt, "transaction_count": 1},
                "$set": {"updated_at": now},
            },
        )
        if result.matched_count > 0:
            wallet_updated = True
            break

    if not wallet_updated:
        new_id = cid_int if cid_int is not None else cid_str
        await db.wallets.insert_one({
            "customer_id": new_id,
            "balance": amt,
            "total_credited": amt,
            "total_debited": 0.0,
            "transaction_count": 1,
            "created_at": now,
            "updated_at": now,
        })

    tid = await _next_txn_id(db)
    await db.transactions.insert_one({
        "_id": tid,
        "transaction_id": tid,
        "customer_id": payload.customer_id,
        "type": "credit",
        "amount": amt,
        "description": payload.description,
        "reference_id": payload.reference_id,
        "created_at": now,
    })

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
    _check_token(x_internal_token)
    db = await get_db()
    now = datetime.utcnow()
    amt = float(payload.amount)

    acc = await _get_account(db, payload.customer_id)
    if not acc:
        raise HTTPException(status_code=404, detail="Account not found")

    current_balance = float(acc.get("balance", 0))
    if current_balance < amt:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance. Available: {current_balance}, Required: {amt}",
        )

    new_balance = current_balance - amt
    await db.bank_accounts.update_one(
        {"_id": acc["_id"]},
        {"$set": {"balance": new_balance, "updated_at": now}},
    )

    cid_int = _try_int(payload.customer_id)
    for cid in ([cid_int] if cid_int is not None else []) + [str(payload.customer_id)]:
        await db.wallets.update_one(
            {"customer_id": cid},
            {
                "$inc": {"balance": -amt, "total_debited": amt, "transaction_count": 1},
                "$set": {"updated_at": now},
            },
        )

    tid = await _next_txn_id(db)
    await db.transactions.insert_one({
        "_id": tid,
        "transaction_id": tid,
        "customer_id": payload.customer_id,
        "type": "debit",
        "amount": amt,
        "balance_after": new_balance,
        "description": payload.description,
        "reference_id": payload.reference_id,
        "created_at": now,
    })

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
    return {
        "customer_id": customer_id,
        "balance": float((acc or {}).get("balance", 0)),
    }


@router.post("/verify-mpin")
async def verify_mpin_internal(
    payload: MpinVerifyPayload,
    x_internal_token: str = Header(..., alias="X-Internal-Token"),
):
    _check_token(x_internal_token)
    cid = _try_int(payload.customer_id)
    if cid is None:
        cid = payload.customer_id
    from ...services.wallet.mpin import verify_mpin as _verify_mpin
    return await _verify_mpin(cid, payload.mpin)