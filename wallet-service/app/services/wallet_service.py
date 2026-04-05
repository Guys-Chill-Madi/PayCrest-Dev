"""Compatibility facade for wallet service APIs.

Implementation is split under `lms_backend.app.services.wallet.*` to keep the
service layer modular, while preserving existing import paths.
"""

from .wallet.core import get_or_create_wallet, get_wallet_balance
from .wallet.mpin import (
    MPIN_LOCKOUT_MINUTES,
    get_mpin_status,
    reset_mpin,
    reset_mpin_with_password,
    setup_mpin,
    verify_mpin,
)
from .wallet.transactions import credit_wallet, debit_wallet, get_transaction_history

__all__ = [
    "MPIN_LOCKOUT_MINUTES",
    "credit_wallet",
    "debit_wallet",
    "get_mpin_status",
    "get_or_create_wallet",
    "get_transaction_history",
    "get_wallet_balance",
    "reset_mpin",
    "reset_mpin_with_password",
    "setup_mpin",
    "verify_mpin",
]

