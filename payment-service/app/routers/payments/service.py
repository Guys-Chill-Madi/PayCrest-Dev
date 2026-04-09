"""
payment-service/app/routers/payments/service.py

All inter-service calls use X-Internal-Token.
Cashfree is mocked — no real SDK calls.
"""
import httpx
import logging
import os
from datetime import datetime

from fastapi import HTTPException
from ...core.config import settings

logger = logging.getLogger(__name__)

_INTERNAL_TOKEN = getattr(settings, "INTERNAL_SERVICE_TOKEN", None) or os.getenv("INTERNAL_SERVICE_TOKEN", "")
_WALLET_URL     = getattr(settings, "WALLET_SERVICE_URL",     None) or os.getenv("WALLET_SERVICE_URL",     "http://wallet-service:8000")
_LOAN_URL       = getattr(settings, "LOAN_SERVICE_URL",       None) or os.getenv("LOAN_SERVICE_URL",       "http://loan-service:8000")

_INTERNAL_HEADERS = {
    "X-Internal-Token": _INTERNAL_TOKEN,
    "Content-Type": "application/json",
}


async def credit_wallet(customer_id, amount: float, description: str) -> dict:
    """Credit wallet via wallet-service internal API."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{_WALLET_URL}/internal/credit",
                json={"customer_id": str(customer_id), "amount": float(amount), "description": description},
                headers=_INTERNAL_HEADERS,
            )
            if resp.status_code == 200:
                return resp.json()
            raise HTTPException(status_code=resp.status_code, detail=f"Wallet credit failed: {resp.text}")
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="wallet-service unavailable")
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="wallet-service timed out")


async def get_wallet_balance(customer_id) -> dict:
    """Get wallet balance via wallet-service internal API."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"{_WALLET_URL}/internal/balance/{customer_id}",
                headers=_INTERNAL_HEADERS,
            )
            if resp.status_code == 200:
                return resp.json()
    except Exception as e:
        logger.warning(f"[PAYMENT] get_wallet_balance failed: {e}")
    return {"balance": 0.0}


async def pay_emi_any_wallet(loan_id: str, customer_id) -> dict:
    """Trigger EMI payment via loan-service internal API."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{_LOAN_URL}/internal/pay-emi/{loan_id}",
                json={"customer_id": str(customer_id)},
                headers=_INTERNAL_HEADERS,
            )
            if resp.status_code == 200:
                return resp.json()
            raise HTTPException(status_code=resp.status_code, detail=f"EMI payment failed: {resp.text}")
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="loan-service unavailable")
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="loan-service timed out")


async def verify_mpin(customer_id, mpin: str) -> dict:
    """Verify MPIN via wallet-service internal API."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{_WALLET_URL}/internal/verify-mpin",
                json={"customer_id": str(customer_id), "mpin": mpin},
                headers=_INTERNAL_HEADERS,
            )
            if resp.status_code == 200:
                return resp.json()
            raise HTTPException(status_code=resp.status_code, detail="MPIN verification failed")
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="wallet-service unavailable")


async def get_db():
    from ...database.mongo import get_db as _get_db
    return await _get_db()