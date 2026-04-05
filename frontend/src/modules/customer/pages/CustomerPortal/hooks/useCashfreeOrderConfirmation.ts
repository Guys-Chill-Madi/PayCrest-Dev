import { useEffect, useRef } from "react";
import type { NavigateFunction } from "react-router-dom";
import { confirmCashfreeOrder } from "../../../../../modules/customer/services/customerApi";
import { getSession } from "../../../../../lib/api/session";

export type WalletToastState = {
  visible: boolean;
  amount: number;
  mode?: "credit" | "debit";
  context?: "wallet" | "emi";
};

type Params = {
  locationSearch: string;
  locationPathname: string;
  navigate: NavigateFunction;
  txPageSize: number;
  refreshCustomer: () => Promise<void>;
  loadTxPage: (page: number, limit?: number) => Promise<void>;
  pushNotification: (item: { title: string; message: string; kind: "info" | "success" | "warning" | "error" }) => void;
  setError: (msg: string) => void;
  setWalletToast: (next: WalletToastState) => void;
  setCashfreeOverlay: (value: "idle" | "loading" | "success") => void;
};

const WALLET_TOAST_RESTORE_KEY = "wallet_toast_restore";

// Module-level guards survive remounts (including StrictMode/dev remount behavior).
const globalInFlightOrderIds = new Set<string>();
const globalProcessedOrderIds = new Set<string>();
const globalRetryAfterByOrderId = new Map<string, number>();

const lockKey = (orderId: string) => `cashfree_confirm_lock_${orderId}`;
const processedKey = (orderId: string) => `cashfree_confirm_done_${orderId}`;

function hasActiveLock(orderId: string) {
  try {
    const raw = sessionStorage.getItem(lockKey(orderId));
    if (!raw) return false;
    const until = Number(raw);
    if (!Number.isFinite(until) || Date.now() >= until) {
      sessionStorage.removeItem(lockKey(orderId));
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function setLock(orderId: string, ms: number) {
  try {
    sessionStorage.setItem(lockKey(orderId), String(Date.now() + Math.max(1000, ms)));
  } catch {
    // ignore storage failures
  }
}

function clearLock(orderId: string) {
  try {
    sessionStorage.removeItem(lockKey(orderId));
  } catch {
    // ignore storage failures
  }
}

function isProcessed(orderId: string) {
  if (globalProcessedOrderIds.has(orderId)) return true;
  try {
    return sessionStorage.getItem(processedKey(orderId)) === "1";
  } catch {
    return false;
  }
}

function markProcessed(orderId: string) {
  globalProcessedOrderIds.add(orderId);
  try {
    sessionStorage.setItem(processedKey(orderId), "1");
  } catch {
    // ignore storage failures
  }
}

function isPaidStatusValue(value: unknown) {
  const v = String(value || "").trim().toLowerCase();
  return v === "paid" || v === "success" || v === "completed" || v === "charged" || v === "captured";
}

function isPaidLikeResponse(res: any, params: URLSearchParams) {
  if (res?.paid === true) return true;
  if (isPaidStatusValue(res?.status)) return true;
  if (isPaidStatusValue(res?.order_status)) return true;
  if (res?.ok === true && (isPaidStatusValue(res?.status) || isPaidStatusValue(res?.order_status))) return true;
  if (isPaidStatusValue(params.get("txStatus"))) return true;
  if (isPaidStatusValue(params.get("payment_status"))) return true;
  if (isPaidStatusValue(params.get("paymentStatus"))) return true;
  return false;
}

export default function useCashfreeOrderConfirmation({
  locationSearch,
  locationPathname,
  navigate,
  txPageSize,
  refreshCustomer,
  loadTxPage,
  pushNotification,
  setError,
  setWalletToast,
  setCashfreeOverlay,
}: Params) {
  const inFlightOrderIdsRef = useRef<Set<string>>(new Set());
  const processedOrderIdsRef = useRef<Set<string>>(new Set());
  const retryAfterRef = useRef<Map<string, number>>(new Map());
  const AUTO_CONFIRM_ATTEMPTS = 2;
  const AUTO_CONFIRM_GAP_MS = 1500;

  useEffect(() => {
    const params = new URLSearchParams(locationSearch || "");
    let orderId = params.get("cf_order_id") || params.get("order_id") || params.get("orderId");
    const orderFromQuery = !!orderId;
    let deferConfirmMs = 0;

    const hasReturnSignal =
      orderFromQuery ||
      params.has("txStatus") ||
      params.has("payment_status") ||
      params.has("paymentStatus") ||
      params.has("cf_payment_session_id") ||
      params.has("order_token") ||
      params.has("referenceId");

    if (!orderId) {
      try {
        const raw = sessionStorage.getItem("cashfree_pending");
        const pending = raw ? JSON.parse(raw) : null;
        if (pending?.orderId) {
          const session = getSession();
          const pendingUserId = String(pending?.userId || "");
          const sessionUserId = String(session?.userId || "");
          if (pendingUserId && sessionUserId && pendingUserId !== sessionUserId) {
            try {
              sessionStorage.removeItem("cashfree_pending");
            } catch {
              // ignore
            }
            return;
          }
          const createdAt = Number(pending?.createdAt || 0);
          const ageMs = Date.now() - (Number.isFinite(createdAt) ? createdAt : 0);
          const minConfirmAgeMs = 4500;
          const referrerLooksLikeCashfree =
            typeof document !== "undefined" &&
            typeof document.referrer === "string" &&
            /cashfree/i.test(document.referrer);
          const maxPendingConfirmAgeMs = 20 * 60 * 1000;
          const stalePendingCleanupAgeMs = 6 * 60 * 60 * 1000;
          const shouldConfirmFromPending =
            hasReturnSignal || referrerLooksLikeCashfree || (ageMs >= 0 && ageMs <= maxPendingConfirmAgeMs);

          // Confirm recent pending orders even if URL params are stripped after redirect.
          if (!shouldConfirmFromPending) {
            if (ageMs > stalePendingCleanupAgeMs) {
              try {
                sessionStorage.removeItem("cashfree_pending");
              } catch {
                // ignore
              }
            }
            return;
          }

          if (ageMs < minConfirmAgeMs) {
            deferConfirmMs = Math.max(0, minConfirmAgeMs - ageMs);
          }

          orderId = String(pending.orderId);
        }
      } catch {
        // ignore
      }
    }

    if (!orderId) return;

    // React StrictMode and parent rerenders can trigger this effect multiple times.
    // Ensure each order is confirmed only once at a time.
    if (
      processedOrderIdsRef.current.has(orderId) ||
      inFlightOrderIdsRef.current.has(orderId) ||
      globalProcessedOrderIds.has(orderId) ||
      globalInFlightOrderIds.has(orderId) ||
      isProcessed(orderId) ||
      hasActiveLock(orderId)
    ) {
      return;
    }

    const now = Date.now();
    const nextRetryAt = Math.max(
      retryAfterRef.current.get(orderId) || 0,
      globalRetryAfterByOrderId.get(orderId) || 0,
    );
    if (now < nextRetryAt) return;

    inFlightOrderIdsRef.current.add(orderId);
    globalInFlightOrderIds.add(orderId);
    // Keep a short lock while this run is active to prevent re-entrancy loops.
    setLock(orderId, 30_000);

    let cancelled = false;
    void (async () => {
      let paidSuccess = false;
      let shouldStripQuery = orderFromQuery;
      try {
        if (deferConfirmMs > 0) {
          await new Promise((r) => window.setTimeout(r, deferConfirmMs));
          if (cancelled) return;
        }

        setCashfreeOverlay("loading");
        let res: any = null;
        let paidLike = false;
        const maxAttempts = AUTO_CONFIRM_ATTEMPTS;
        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
          res = await confirmCashfreeOrder(orderId);
          if (cancelled) return;
          paidLike = isPaidLikeResponse(res, params);
          if (paidLike) break;
          if (attempt < maxAttempts) {
            await new Promise((r) => window.setTimeout(r, AUTO_CONFIRM_GAP_MS));
            if (cancelled) return;
          }
        }

        if (cancelled) return;

        if (paidLike) {
          paidSuccess = true;
          processedOrderIdsRef.current.add(orderId);
          markProcessed(orderId);
          setCashfreeOverlay("success");
          let pending: any = null;
          try {
            const raw = sessionStorage.getItem("cashfree_pending");
            pending = raw ? JSON.parse(raw) : null;
          } catch {
            pending = null;
          }

          const purpose = String(res?.purpose || pending?.purpose || "");
          let amount = Number(res?.amount || 0);
          if (!Number.isFinite(amount) || amount <= 0) {
            try {
              if (pending?.orderId === orderId) {
                amount = Number(pending?.amount || 0);
              }
            } catch {
              // ignore
            }
          }
          let toastShown = false;

          if (purpose === "wallet_topup") {
            const toastAmount = Number.isFinite(amount) && amount > 0 ? amount : Number(pending?.amount || 0);
            const toastState: WalletToastState = {
              visible: true,
              amount: Number.isFinite(toastAmount) ? toastAmount : 0,
              mode: "credit",
              context: "wallet",
            };
            setWalletToast(toastState);
            try {
              sessionStorage.setItem(
                WALLET_TOAST_RESTORE_KEY,
                JSON.stringify({ ...toastState, createdAt: Date.now() }),
              );
            } catch {
              // ignore
            }
            toastShown = true;
            pushNotification({
              title: "Wallet Credited",
              message: `Credited INR ${Math.max(0, Number(toastAmount || 0)).toLocaleString("en-IN")} to your wallet via Cashfree.`,
              kind: "success",
            });
          }

          if (purpose === "emi") {
            if (Number.isFinite(amount) && amount > 0) {
              const toastState: WalletToastState = { visible: true, amount, mode: "debit", context: "emi" };
              setWalletToast(toastState);
              try {
                sessionStorage.setItem(
                  WALLET_TOAST_RESTORE_KEY,
                  JSON.stringify({ ...toastState, createdAt: Date.now() }),
                );
              } catch {
                // ignore
              }
              toastShown = true;
            }
            pushNotification({
              title: "EMI Paid",
              message: "EMI payment completed via Cashfree.",
              kind: "success",
            });
          }

          if (purpose === "wallet_topup_then_emi") {
            const emiAmt = Number(res?.emi_amount || 0);
            if (Number.isFinite(emiAmt) && emiAmt > 0) {
              const toastState: WalletToastState = { visible: true, amount: emiAmt, mode: "debit", context: "emi" };
              setWalletToast(toastState);
              try {
                sessionStorage.setItem(
                  WALLET_TOAST_RESTORE_KEY,
                  JSON.stringify({ ...toastState, createdAt: Date.now() }),
                );
              } catch {
                // ignore
              }
              toastShown = true;
            }
            pushNotification({
              title: "EMI Paid",
              message: "Wallet top-up completed and EMI paid successfully.",
              kind: "success",
            });
          }

          if (!toastShown) {
            const fallbackAmount = Number.isFinite(amount) && amount > 0 ? amount : Number(pending?.amount || 0);
            const isEmiLike = /emi/i.test(purpose);
            const toastState: WalletToastState = {
              visible: true,
              amount: Number.isFinite(fallbackAmount) ? fallbackAmount : 0,
              mode: isEmiLike ? "debit" : "credit",
              context: isEmiLike ? "emi" : "wallet",
            };
            setWalletToast(toastState);
            try {
              sessionStorage.setItem(
                WALLET_TOAST_RESTORE_KEY,
                JSON.stringify({ ...toastState, createdAt: Date.now() }),
              );
            } catch {
              // ignore
            }
            pushNotification({
              title: isEmiLike ? "EMI Paid" : "Wallet Credited",
              message: isEmiLike
                ? "Payment completed successfully."
                : `Credited INR ${Math.max(0, Number(fallbackAmount || 0)).toLocaleString("en-IN")} to your wallet successfully.`,
              kind: "success",
            });
          }

          void refreshCustomer();
          window.setTimeout(() => {
            void loadTxPage(1, txPageSize || 10);
          }, 500);

          try {
            sessionStorage.removeItem("cashfree_pending");
          } catch {
            // ignore
          }
        } else {
          // Prevent non-stop looping overlay for pending statuses.
          const retryAt = Date.now() + 45_000;
          retryAfterRef.current.set(orderId, retryAt);
          globalRetryAfterByOrderId.set(orderId, retryAt);
          setLock(orderId, 45_000);
          pushNotification({
            title: "Payment Pending",
            message: "Cashfree payment is still pending. Please retry after a few seconds.",
            kind: "warning",
          });
        }
      } catch (err) {
        if (cancelled) return;
        // Back off after failures so UI doesn't keep flashing loading overlay.
        const retryAt = Date.now() + 45_000;
        retryAfterRef.current.set(orderId, retryAt);
        globalRetryAfterByOrderId.set(orderId, retryAt);
        setLock(orderId, 45_000);
        const msg =
          err instanceof Error ? (err as any).humanMessage || err.message : String(err ?? "Payment confirmation failed");
        setError(msg);
        pushNotification({
          title: "Payment Failed",
          message: msg,
          kind: "error",
        });
      } finally {
        inFlightOrderIdsRef.current.delete(orderId);
        globalInFlightOrderIds.delete(orderId);
        if (shouldStripQuery && !cancelled) {
          const next = new URLSearchParams(locationSearch || "");
          next.delete("cf_order_id");
          next.delete("order_id");
          next.delete("orderId");
          navigate(
            {
              pathname: locationPathname,
              search: next.toString() ? `?${next.toString()}` : "",
            },
            { replace: true },
          );
        }
        if (!paidSuccess) setCashfreeOverlay("idle");
        if (paidSuccess) clearLock(orderId);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    loadTxPage,
    locationPathname,
    locationSearch,
    navigate,
    pushNotification,
    refreshCustomer,
    setCashfreeOverlay,
    setError,
    setWalletToast,
    txPageSize,
  ]);
}
