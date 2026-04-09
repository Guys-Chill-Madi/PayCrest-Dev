from fastapi import APIRouter, Depends
from ...core.security import require_roles
from ...models.enums import Roles
from ...schemas.wallet import (
    MPINSetupRequest,
    MPINVerifyRequest,
    MPINResetRequest,
    MPINResetWithPasswordRequest,
    AddMoneyRequest,
)
from .service import (
    get_wallet_balance,
    credit_wallet,
    debit_wallet,
    get_transaction_history,
    setup_mpin,
    verify_mpin,
    reset_mpin,
    reset_mpin_with_password,
    get_mpin_status,
)
from ...utils.serializers import normalize_doc

router = APIRouter(prefix="", tags=["wallet"])


@router.get("/balance")
async def get_balance(user=Depends(require_roles(Roles.CUSTOMER))):
    """Get current wallet balance for logged-in customer."""
    wallet = await get_wallet_balance(user["_id"])
    return {
        "balance": wallet.get("balance", 0),
        "total_credited": wallet.get("total_credited", 0),
        "total_debited": wallet.get("total_debited", 0),
        "transaction_count": wallet.get("transaction_count", 0),
        "last_updated": wallet.get("updated_at"),
    }


@router.post("/add-money")
async def add_money(payload: AddMoneyRequest, user=Depends(require_roles(Roles.CUSTOMER))):
    """Add money to wallet with M-PIN verification."""
    await verify_mpin(user["_id"], payload.mpin)
    transaction = await credit_wallet(user["_id"], payload.amount, payload.description)
    return {
        "success": True,
        "message": f"Successfully added ₹{payload.amount} to your wallet",
        "transaction_id": transaction.get("transaction_id"),
        "new_balance": transaction.get("new_balance"),
    }


@router.post("/debit")
async def debit_money(payload: AddMoneyRequest, user=Depends(require_roles(Roles.CUSTOMER))):
    """Customer-initiated debit (withdraw from wallet) with M-PIN verification."""
    await verify_mpin(user["_id"], payload.mpin)
    transaction = await debit_wallet(user["_id"], payload.amount, payload.description)
    return {
        "success": True,
        "message": f"Debited ₹{payload.amount} from your wallet",
        "transaction_id": transaction.get("transaction_id"),
        "new_balance": transaction.get("new_balance"),
    }


@router.get("/transactions")
async def get_transactions(
    page: int = 1,
    limit: int = 20,
    user=Depends(require_roles(Roles.CUSTOMER)),
):
    """Get transaction history for customer."""
    return await get_transaction_history(user["_id"], page, limit)


@router.post("/mpin/setup")
async def setup_mpin_endpoint(
    payload: MPINSetupRequest,
    user=Depends(require_roles(Roles.CUSTOMER)),
):
    """Set up M-PIN for customer (one-time, after account creation)."""
    return await setup_mpin(user["_id"], payload.mpin, payload.confirm_mpin)


@router.post("/mpin/verify")
async def verify_mpin_endpoint(
    payload: MPINVerifyRequest,
    user=Depends(require_roles(Roles.CUSTOMER)),
):
    """Verify M-PIN (used before accessing dashboard)."""
    return await verify_mpin(user["_id"], payload.mpin)


@router.get("/mpin/status")
async def mpin_status_endpoint(user=Depends(require_roles(Roles.CUSTOMER))):
    """Get whether M-PIN is configured for current customer."""
    return await get_mpin_status(user["_id"])


@router.put("/mpin/reset")
async def reset_mpin_endpoint(
    payload: MPINResetRequest,
    user=Depends(require_roles(Roles.CUSTOMER)),
):
    """Reset M-PIN."""
    return await reset_mpin(
        user["_id"],
        payload.old_mpin,
        payload.new_mpin,
        payload.confirm_mpin,
    )


@router.put("/mpin/reset/password")
async def reset_mpin_password_endpoint(
    payload: MPINResetWithPasswordRequest,
    user=Depends(require_roles(Roles.CUSTOMER)),
):
    """Reset M-PIN after verifying account password."""
    return await reset_mpin_with_password(
        user["_id"],
        payload.password,
        payload.new_mpin,
        payload.confirm_mpin,
    )


@router.get("/admin/customer/{customer_id}/balance")
async def get_customer_balance(
    customer_id: str | int,
    user=Depends(require_roles(Roles.ADMIN, Roles.MANAGER)),
):
    """Get wallet balance for specific customer (admin/manager view)."""
    wallet = await get_wallet_balance(customer_id)
    return {
        "customer_id": customer_id,
        "balance": wallet.get("balance", 0),
        "total_credited": wallet.get("total_credited", 0),
        "total_debited": wallet.get("total_debited", 0),
        "transaction_count": wallet.get("transaction_count", 0),
        "created_at": wallet.get("created_at"),
        "updated_at": wallet.get("updated_at"),
    }