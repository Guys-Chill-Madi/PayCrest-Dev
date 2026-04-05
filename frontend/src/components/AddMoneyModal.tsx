import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MPINVerificationModal from "./MPINVerificationModal";
import { useAccessibleModal } from "../hooks/useAccessibleModal";
import { debitFromWallet, getWalletBalance } from "../modules/wallet/services/walletApi";
import { createCashfreeWalletTopupOrder } from "../modules/payments/services/paymentsApi";
import { openCashfreeCheckout } from "../lib/cashfree";
import { getSession } from "../lib/api/session";
import CashfreePaymentOverlay from "./CashfreePaymentOverlay";
import "../styles/verification.css";
import "../styles/add-money-modal.css";

interface AddMoneyModalProps {
  mode: "credit" | "debit";
  onSuccess: (newBalance: number, delta: number, mode: "credit" | "debit") => void;
  onClose: () => void;
  minRequiredBalance?: number;
  availableBalance?: number | null;
}

function formatInrAmount(value: number) {
  const n = Number(value);
  const safe = Number.isFinite(n) ? n : 0;
  return `Rs ${safe.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatWalletErrorMessage(err: unknown) {
  const raw =
    typeof err === "string"
      ? err
      : (err as any)?.humanMessage || (err as any)?.message || String(err ?? "");

  // base.ts errors often look like: "400 Bad Request: <message> (<url>)"
  const withoutUrl = raw.replace(/\s*\(https?:\/\/.*\)\s*$/i, "").trim();
  const withoutStatusPrefix = withoutUrl.replace(/^\d+\s+[A-Za-z ]+:\s*/, "").trim();

  if (/cashfree is not configured/i.test(withoutStatusPrefix)) {
    return "Cashfree is not configured on the backend. Set CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET in `frontend 3/lms_backend/.env` and restart the backend.";
  }

  const m = withoutStatusPrefix.match(
    /insufficient balance\.\s*available:\s*([0-9]+(?:\.[0-9]+)?)\s*,\s*required:\s*([0-9]+(?:\.[0-9]+)?)/i,
  );
  if (m) {
    const available = Number(m[1]);
    const required = Number(m[2]);
    return `Insufficient balance. Available: ${formatInrAmount(available)}, Required: ${formatInrAmount(required)}.`;
  }

  return withoutStatusPrefix || "Something went wrong.";
}

export default function AddMoneyModal({
  mode,
  onSuccess,
  onClose,
  minRequiredBalance = 0,
  availableBalance = null,
}: AddMoneyModalProps) {
  const MIN_TXN_AMOUNT = 10;
  const MAX_TXN_AMOUNT = 1_000_000; // Rs 10,00,000
  const HIGH_VALUE_THRESHOLD = 100_000;

  const [amountInput, setAmountInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMpin, setShowMpin] = useState(false);
  const [showCashfreeBridge, setShowCashfreeBridge] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletBalanceLoading, setWalletBalanceLoading] = useState(false);
  const [highValueConfirmAmount, setHighValueConfirmAmount] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const enforceMinBalance = minRequiredBalance > 0;

  const maxDebit = useMemo(() => {
    if (mode !== "debit") return null;
    if (walletBalance === null) return null;
    return Math.max(0, Number(walletBalance || 0) - Number(minRequiredBalance || 0));
  }, [mode, walletBalance, minRequiredBalance]);

  const fetchBestWalletBalance = async () => {
    if (typeof availableBalance === "number" && Number.isFinite(availableBalance)) {
      return Number(availableBalance);
    }
    try {
      const bal = await getWalletBalance();
      return Number(bal.balance || 0);
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (mode !== "debit") return;
    if (typeof availableBalance !== "number") return;
    setWalletBalance(Number.isFinite(availableBalance) ? availableBalance : 0);
  }, [availableBalance, mode]);

  useEffect(() => {
    if (mode !== "debit") return;
    let mounted = true;
    setWalletBalanceLoading(true);
    void (async () => {
      try {
        const best = await fetchBestWalletBalance();
        if (!mounted) return;
        setWalletBalance(best === null ? null : Number(best || 0));
      } catch {
        if (!mounted) return;
        setWalletBalance(null);
      } finally {
        if (!mounted) return;
        setWalletBalanceLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [mode]);

  const handleModalClose = useCallback(() => {
    if (!loading) onClose();
  }, [loading, onClose]);

  useAccessibleModal(panelRef, true, handleModalClose);

  const validateAmount = () => {
    const amt = Number(String(amountInput || "").trim());
    if (!amt || amt <= 0 || Number.isNaN(amt)) {
      setError("Enter a valid amount.");
      return null;
    }
    if (amt < MIN_TXN_AMOUNT) {
      setError(`Minimum amount per transaction is Rs ${MIN_TXN_AMOUNT.toLocaleString("en-IN")}.`);
      return null;
    }
    if (amt > MAX_TXN_AMOUNT) {
      setError(`Transaction limit is Rs ${MAX_TXN_AMOUNT.toLocaleString("en-IN")} per payment.`);
      return null;
    }
    return amt;
  };

  /**
 * PATCH for frontend/src/components/AddMoneyModal.tsx
 *
 * Replace the startCreditCheckout function (lines ~116-145) with this version.
 * It detects mock payment sessions and skips the Cashfree SDK entirely,
 * instead storing the pending order and relying on useCashfreeOrderConfirmation
 * to auto-confirm it (which calls our mock /confirm endpoint).
 *
 * FIND this function in AddMoneyModal.tsx:
 *   const startCreditCheckout = async (amt: number) => {
 *
 * REPLACE the entire function body with the code below.
 */

  const startCreditCheckout = async (amt: number) => {
    setLoading(true);
    setError(null);
    setShowCashfreeBridge(true);
    try {
      const cf = await createCashfreeWalletTopupOrder({
        amount: amt,
        description: "Wallet top-up",
      });
      const orderId = String((cf as any)?.order_id || "");
      const paymentLink = (cf as any)?.payment_link as string | undefined | null;
      const paymentSessionId = (cf as any)?.payment_session_id as string | undefined | null;

      if (!orderId) throw new Error("Payment order creation failed (missing order_id)");

      // Store pending order for auto-confirmation hook
      try {
        const session = getSession();
        sessionStorage.setItem(
          "cashfree_pending",
          JSON.stringify({
            orderId,
            purpose: "wallet_topup",
            amount: amt,
            createdAt: Date.now(),
            userId: String(session?.userId || ""),
          }),
        );
      } catch {
        // ignore storage failures
      }

      // MOCK MODE: if payment_session_id starts with "mock_" or is null/dummy,
      // skip Cashfree SDK and close the modal — the confirmation hook will auto-fire
      const isMockSession =
        !paymentSessionId ||
        paymentSessionId === "dummy_session" ||
        String(paymentSessionId).startsWith("mock_");

      if (isMockSession) {
        // Close modal — useCashfreeOrderConfirmation hook will auto-confirm
        setShowCashfreeBridge(false);
        onClose();
        return;
      }

      // Real payment link — redirect
      if (paymentLink) {
        setShowCashfreeBridge(false);
        onClose();
        window.location.assign(paymentLink);
        return;
      }

      // Real Cashfree session — open SDK checkout
      if (paymentSessionId) {
        setShowCashfreeBridge(false);
        onClose();
        await openCashfreeCheckout({ paymentSessionId, redirectTarget: "_self" });
        return;
      }

      throw new Error("Payment order created but no payment session was returned");
    } catch (err) {
      setShowCashfreeBridge(false);
      setError(formatWalletErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const continueTransaction = (amt: number) => {
    if (mode === "credit") {
      setShowMpin(true);
      return;
    }

    void (async () => {
      setWalletBalanceLoading(true);
      try {
        const current = Number((await fetchBestWalletBalance()) || 0);
        setWalletBalance(Number.isFinite(current) ? current : 0);
        const minKeep = enforceMinBalance ? Number(minRequiredBalance || 0) : 0;

        if (enforceMinBalance && current <= minKeep) {
          setError(
            `Minimum balance of Rs ${minKeep.toLocaleString("en-IN")} must be maintained. You cannot debit when balance is Rs ${minKeep.toLocaleString("en-IN")}.`,
          );
          return;
        }

        const allowable = Math.max(0, current - minKeep);
        if (amt > allowable) {
          setError(
            enforceMinBalance
              ? `You can debit up to Rs ${allowable.toLocaleString("en-IN")} (minimum balance Rs ${minKeep.toLocaleString("en-IN")} must remain).`
              : "Insufficient balance for debit",
          );
          return;
        }

        setShowMpin(true);
      } catch {
        setError("Failed to check balance");
      } finally {
        setWalletBalanceLoading(false);
      }
    })();
  };

  const start = () => {
    setError(null);
    const amt = validateAmount();
    if (!amt) return;
    if (amt >= HIGH_VALUE_THRESHOLD) {
      setHighValueConfirmAmount(amt);
      return;
    }
    continueTransaction(amt);
  };

  const handleMpinVerified = async (mpin: string) => {
    if (mode === "credit") {
      setShowMpin(false);
      const amt = validateAmount();
      if (!amt) return;
      await startCreditCheckout(amt);
      return;
    }

    setShowMpin(false);
    setLoading(true);
    setError(null);
    try {
      const amt = validateAmount();
      if (!amt) throw new Error("Invalid amount");

      const prevBal = await fetchBestWalletBalance();

      const res = await debitFromWallet(amt, mpin);

      const fromRes = Number(
        res?.new_balance ??
          res?.balance ??
          res?.wallet_balance ??
          res?.current_balance ??
          NaN,
      );
      const best = await fetchBestWalletBalance();

      const prev = Number(prevBal ?? best ?? 0);
      const expected = Math.max(0, prev - amt);

      let newBal = Number.isFinite(fromRes) ? fromRes : Number(best ?? NaN);
      if (!Number.isFinite(newBal)) newBal = expected;

      // If backend balance endpoints lag, ensure UI still reflects the debit immediately.
      if (newBal >= prev) newBal = expected;

      onSuccess(newBal, amt, "debit");
      onClose();
    } catch (err) {
      setShowCashfreeBridge(false);
      setError(formatWalletErrorMessage(err));
      // Keep the "Available" number in sync after a failed debit (e.g., backend says insufficient balance).
      if (mode === "debit") {
        try {
          const best = await fetchBestWalletBalance();
          setWalletBalance(best === null ? null : Number(best || 0));
        } catch {
          // ignore
        }
      }
    } finally {
      setShowCashfreeBridge(false);
      setLoading(false);
    }
  };

  const isStepTwoActive = showMpin || loading;
  const isStepThreeActive = loading || showCashfreeBridge;

  return (
    <div
      className="wallet-modal__backdrop"
      onMouseDown={(e) => {
        // Keep modal stable; close only via explicit actions (Cancel/Close/Escape).
        e.stopPropagation();
      }}
    >
      <div
        className="wallet-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-modal-title"
        aria-describedby="wallet-modal-description"
        ref={panelRef}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={`wallet-modal__hero ${mode === "debit" ? "wallet-modal__hero--debit" : ""}`}>
          <div className="wallet-modal__hero-title">
            <h3 id="wallet-modal-title">{mode === "credit" ? "Add Money" : "Debit Money"}</h3>
            <p id="wallet-modal-description">
              {mode === "credit"
                ? "Top up your wallet. M-PIN is required before Cashfree checkout."
                : "Withdraw from wallet securely using your M-PIN."}
            </p>
          </div>
        </div>

        <div className="wallet-modal__progress" aria-label="Transaction progress">
          <span className="wallet-modal__progress-dot wallet-modal__progress-dot--active">1</span>
          <span className="wallet-modal__progress-line" />
          <span className={`wallet-modal__progress-dot ${isStepTwoActive ? "wallet-modal__progress-dot--active" : ""}`}>2</span>
          <span className="wallet-modal__progress-line" />
          <span className={`wallet-modal__progress-dot ${isStepThreeActive ? "wallet-modal__progress-dot--active" : ""}`}>3</span>
        </div>

        {mode === "debit" && (
          <div className="wallet-modal__hint">
            <div>
              <span>Current Balance</span>
              <strong>
                {walletBalanceLoading ? "Checking..." : `Rs ${Number(walletBalance || 0).toLocaleString("en-IN")}`}
              </strong>
            </div>
            <div>
              <span>Max Debit</span>
              <strong>
                {walletBalanceLoading
                  ? "Checking..."
                  : `Rs ${Number(maxDebit ?? walletBalance ?? 0).toLocaleString("en-IN")}`}
              </strong>
            </div>
            {enforceMinBalance && (
              <p className="wallet-modal__hint-note">
                Min balance kept: Rs {Number(minRequiredBalance || 0).toLocaleString("en-IN")}
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="form-message error wallet-modal__message">
            {error}
          </div>
        )}

        <div className="wallet-modal__amount-row">
          <div className="wallet-modal__amount">
            <span className="wallet-modal__currency">{"\u20B9"}</span>
            <input
              type="text"
              min={MIN_TXN_AMOUNT}
              max={MAX_TXN_AMOUNT}
              value={amountInput}
              onChange={(e) => {
                let next = String(e.target.value || "").replace(/[^\d.]/g, "");
                if (next.startsWith(".")) next = `0${next}`;
                const parts = next.split(".");
                if (parts.length > 2) next = `${parts[0]}.${parts.slice(1).join("")}`;
                const [whole = "", fraction = ""] = next.split(".");
                if (fraction.length > 2) next = `${whole}.${fraction.slice(0, 2)}`;
                setAmountInput(next);
              }}
              className="wallet-modal__amount-input"
              placeholder="0"
              inputMode="decimal"
              aria-label="Enter amount"
            />
          </div>
          <button
            className={`wallet-modal__cta ${mode === "debit" ? "wallet-modal__cta--debit" : ""}`}
            onClick={start}
            disabled={loading}
          >
            {loading ? "Processing..." : mode === "credit" ? "Continue to Cashfree" : "Debit"}
          </button>
        </div>

        {mode === "credit" && (
          <div className="wallet-modal__cashfree-note">
            <span className="wallet-modal__cashfree-lock" aria-hidden="true">
              {"\uD83D\uDD12"}
            </span>
            <span>Secure payment partner: Cashfree</span>
          </div>
        )}

        <div className="wallet-modal__footer">
          <button className="wallet-modal__secondary" type="button" onClick={handleModalClose} disabled={loading}>
            Cancel
          </button>
        </div>
      </div>

      {showMpin && <MPINVerificationModal onVerified={handleMpinVerified} onCancel={() => setShowMpin(false)} />}
      {highValueConfirmAmount !== null && (
        <div className="wallet-modal__confirm-backdrop" role="dialog" aria-modal="true" aria-label="Confirm transaction">
          <div className="wallet-modal__confirm-card">
            <h4>Confirm Transaction</h4>
            <p>
              You are initiating a high-value transaction of{" "}
              <strong>Rs {highValueConfirmAmount.toLocaleString("en-IN")}</strong>. Confirm to continue.
            </p>
            <div className="wallet-modal__confirm-actions">
              <button
                type="button"
                className="wallet-modal__confirm-btn wallet-modal__confirm-btn--secondary"
                onClick={() => setHighValueConfirmAmount(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="wallet-modal__confirm-btn wallet-modal__confirm-btn--primary"
                onClick={() => {
                  const amt = highValueConfirmAmount;
                  setHighValueConfirmAmount(null);
                  if (amt !== null) continueTransaction(amt);
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
      {showCashfreeBridge && (
        <CashfreePaymentOverlay
          variant="loading"
          title="Processing payment"
          subtitle="Moving to Cashfree secure checkout..."
        />
      )}
    </div>
  );
}
