"""
payment-service/app/routers/payments/router.py

Mock payment flow — no real Cashfree SDK.
All payments are processed instantly for DevOps training purposes.
"""
from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ...core.security import require_roles
from ...models.enums import LoanStatus, Roles
from ...utils.id import loan_id_filter
from .service import credit_wallet, get_db, get_wallet_balance, pay_emi_any_wallet, verify_mpin

router = APIRouter(prefix="", tags=["payments"])


# ── Helpers ───────────────────────────────────────────────────
async def _find_active_loan(db, loan_id: str, customer_id):
    filt = loan_id_filter(loan_id)
    filt["customer_id"] = customer_id
    for coll in ("personal_loans", "vehicle_loans", "education_loans", "home_loans"):
        loan = await db[coll].find_one(filt)
        if loan and loan.get("status") == LoanStatus.ACTIVE:
            return coll, loan
    raise HTTPException(status_code=400, detail="Active loan not found")


async def _compute_total_due(db, loan: dict, customer_id) -> float:
    emi = float(loan.get("emi_per_month") or 0)
    if emi <= 0:
        raise HTTPException(status_code=400, detail="Invalid EMI amount on loan")
    next_emi = await db.emi_schedules.find_one(
        {"loan_id": loan.get("loan_id"), "customer_id": customer_id,
         "status": {"$in": ["pending", "overdue"]}},
        sort=[("due_date", 1)],
    )
    penalty = float((next_emi or {}).get("penalty_amount") or 0)
    return round(emi + penalty, 2)


# ── Schemas ───────────────────────────────────────────────────
class MockTopupIn(BaseModel):
    amount: float
    description: str = "Mock wallet top-up"


class HybridStartIn(BaseModel):
    mpin: str


class MockOrderOut(BaseModel):
    order_id: str
    order_amount: float
    order_currency: str = "INR"
    payment_session_id: str
    mock: bool = True


# ── Routes ────────────────────────────────────────────────────

@router.post("/cashfree/wallet/topup/create", response_model=MockOrderOut)
async def mock_wallet_topup(
    payload: MockTopupIn,
    user=Depends(require_roles(Roles.CUSTOMER)),
):
    """
    Mock wallet top-up — credits wallet instantly without any real payment.
    Mirrors the Cashfree top-up API shape so the frontend doesn't need changes.
    """
    customer_id = user.get("customer_id") or user.get("_id")
    if not customer_id:
        raise HTTPException(status_code=401, detail="Missing customer id")

    amt = float(payload.amount or 0)
    if amt <= 0:
        raise HTTPException(status_code=400, detail="amount must be > 0")

    db = await get_db()
    order_id = f"MOCK_{customer_id}_{uuid4().hex[:12]}"
    session_id = f"mock_session_{uuid4().hex}"

    txn = await credit_wallet(customer_id, amt, payload.description)

    await db.cashfree_payments.insert_one({
        "order_id": order_id,
        "customer_id": customer_id,
        "purpose": "wallet_topup",
        "amount": amt,
        "status": "succeeded",
        "wallet_txn": txn,
        "mock": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    })

    return MockOrderOut(order_id=order_id, order_amount=amt, payment_session_id=session_id)


@router.post("/cashfree/emi/{loan_id}/hybrid/start")
async def mock_hybrid_emi(
    loan_id: str,
    payload: HybridStartIn,
    user=Depends(require_roles(Roles.CUSTOMER)),
):
    """
    Mock hybrid EMI payment:
    1. Verify MPIN.
    2. If wallet balance >= total due → pay immediately from wallet.
    3. If balance is short → top up the shortfall instantly (mock), then pay EMI.
    """
    customer_id = user.get("customer_id") or user.get("_id")
    if not customer_id:
        raise HTTPException(status_code=401, detail="Missing customer id")

    await verify_mpin(customer_id, payload.mpin)

    db = await get_db()
    _, loan = await _find_active_loan(db, loan_id, customer_id)
    total_due = await _compute_total_due(db, loan, customer_id)

    wallet = await get_wallet_balance(customer_id)
    balance = float((wallet or {}).get("balance") or 0)

    if balance < total_due:
        shortfall = round(total_due - balance, 2)
        await credit_wallet(customer_id, shortfall, f"Mock top-up for EMI shortfall (loan {loan_id})")

    result = await pay_emi_any_wallet(str(loan_id), customer_id)
    return {"paid": True, "mode": "mock_wallet", "amount": total_due, "result": result}


@router.post("/cashfree/orders/{order_id}/confirm")
async def mock_order_confirm(
    order_id: str,
    user=Depends(require_roles(Roles.CUSTOMER)),
):
    """Mock order confirm — always returns PAID."""
    db = await get_db()
    customer_id = user.get("customer_id") or user.get("_id")
    doc = await db.cashfree_payments.find_one({"order_id": order_id, "customer_id": customer_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")
    return {
        "ok": True,
        "paid": True,
        "order_status": "PAID",
        "mock": True,
        "status": doc.get("status"),
        "amount": doc.get("amount"),
    }


@router.get("/cashfree/orders/{order_id}")
async def mock_order_status(
    order_id: str,
    user=Depends(require_roles(Roles.CUSTOMER)),
):
    """Get mock order status."""
    db = await get_db()
    customer_id = user.get("customer_id") or user.get("_id")
    doc = await db.cashfree_payments.find_one({"order_id": order_id, "customer_id": customer_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")
    return {
        "order_id": order_id,
        "status": doc.get("status"),
        "amount": doc.get("amount"),
        "mock": True,
    }