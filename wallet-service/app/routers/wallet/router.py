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
    # Verify M-PIN first
    await verify_mpin(user["_id"], payload.mpin)
    
    # Credit wallet
    transaction = await credit_wallet(
        user["_id"],
        payload.amount,
        payload.description
    )
    
    return {
        "success": True,
        "message": f"Successfully added â‚¹{payload.amount} to your wallet",
        "transaction_id": transaction.get("transaction_id"),
        "new_balance": transaction.get("new_balance"),
    }


@router.post("/debit")
async def debit_money(payload: AddMoneyRequest, user=Depends(require_roles(Roles.CUSTOMER))):
    """Customer-initiated debit (withdraw from wallet) with M-PIN verification."""
    # verify mpin
    await verify_mpin(user["_id"], payload.mpin)

    # attempt debit
    transaction = await debit_wallet(user["_id"], payload.amount, payload.description)

    return {
        "success": True,
        "message": f"Debited â‚¹{payload.amount} from your wallet",
        "transaction_id": transaction.get("transaction_id"),
        "new_balance": transaction.get("new_balance"),
    }


@router.post("/internal/debit")
async def internal_debit(
    customer_id: str | int,
    amount: float,
    description: str = "Transaction",
    user=Depends(require_roles(Roles.ADMIN, Roles.MANAGER))
):
    """
    Internal debit (for EMI, loan payments, etc.).
    Only admin/manager can call this.
    """
    transaction = await debit_wallet(customer_id, amount, description)
    
    return {
        "success": True,
        "message": f"Debited â‚¹{amount} from customer wallet",
        "transaction_id": transaction.get("transaction_id"),
        "new_balance": transaction.get("new_balance"),
    }


@router.post("/internal/credit")
async def internal_credit(
    customer_id: str | int,
    amount: float,
    description: str = "Transaction",
    user=Depends(require_roles(Roles.ADMIN, Roles.MANAGER))
):
    """
    Internal credit (for payment successes, top-ups, etc.).
    Only admin/manager can call this.
    """
    transaction = await credit_wallet(customer_id, amount, description)
    
    return {
        "success": True,
        "message": f"Credited â‚¹{amount} to customer wallet",
        "transaction_id": transaction.get("transaction_id"),
        "new_balance": transaction.get("new_balance"),
    }


@router.get("/transactions")
async def get_transactions(
    page: int = 1,
    limit: int = 20,
    user=Depends(require_roles(Roles.CUSTOMER))
):
    """Get transaction history for customer."""
    history = await get_transaction_history(user["_id"], page, limit)
    return history


@router.post("/mpin/setup")
async def setup_mpin_endpoint(payload: MPINSetupRequest, user=Depends(require_roles(Roles.CUSTOMER))):
    """Set up M-PIN for customer (one-time, after account creation)."""
    result = await setup_mpin(user["_id"], payload.mpin, payload.confirm_mpin)
    return result


@router.post("/mpin/verify")
async def verify_mpin_endpoint(payload: MPINVerifyRequest, user=Depends(require_roles(Roles.CUSTOMER))):
    """Verify M-PIN (used before accessing dashboard)."""
    result = await verify_mpin(user["_id"], payload.mpin)
    return result


@router.get("/mpin/status")
async def mpin_status_endpoint(user=Depends(require_roles(Roles.CUSTOMER))):
    """Get whether M-PIN is configured for current customer."""
    return await get_mpin_status(user["_id"])


@router.put("/mpin/reset")
async def reset_mpin_endpoint(payload: MPINResetRequest, user=Depends(require_roles(Roles.CUSTOMER))):
    """Reset M-PIN."""
    result = await reset_mpin(
        user["_id"],
        payload.old_mpin,
        payload.new_mpin,
        payload.confirm_mpin,
    )
    return result


@router.put("/mpin/reset/password")
async def reset_mpin_password_endpoint(
    payload: MPINResetWithPasswordRequest,
    user=Depends(require_roles(Roles.CUSTOMER)),
):
    """Reset M-PIN after verifying account password."""
    result = await reset_mpin_with_password(
        user["_id"],
        payload.password,
        payload.new_mpin,
        payload.confirm_mpin,
    )
    return result


@router.get("/admin/customer/{customer_id}/balance")
async def get_customer_balance(
    customer_id: str | int,
    user=Depends(require_roles(Roles.ADMIN, Roles.MANAGER))
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



