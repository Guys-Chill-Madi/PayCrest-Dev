import { useEffect, useState } from "react";
import PopupMessage from "./PopupMessage";
import "../styles/settlement-preview-modal.css";
import { getLoanSettlement, forecloseLoan } from "../modules/customer/services/customerApi";
import { verifyMPIN } from "../modules/wallet/services/walletApi";
import MPINVerificationModal from "./MPINVerificationModal";

export default function SettlementPreviewModal({
  loanId,
  onClose,
  onSuccess,
}: {
  loanId: number | string;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [settlement, setSettlement] = useState<any>(null);
  const [error, setError] = useState<any | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showMpin, setShowMpin] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 15000);
    setLoading(true);
    setError(null);
    void getLoanSettlement(loanId, { signal: controller.signal })
      .then((res) => {
        if (!mounted) return;
        setSettlement(res);
      })
      .catch((err) => {
        if (!mounted) return;
        const isAbort = (err as any)?.name === "AbortError";
        setError(
          isAbort
            ? new Error("Settlement request timed out. Please retry.")
            : err instanceof Error
              ? err
              : new Error(String(err)),
        );
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [loanId]);

  const handleConfirm = async () => {
    // require MPIN verification before foreclosure
    setShowMpin(true);
  };

  const handleMpinVerified = async (mpin: string) => {
    setShowMpin(false);
    setProcessing(true);
    setError(null);
    try {
      await verifyMPIN(mpin);
      await forecloseLoan(loanId);
      if (onSuccess) await onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div
      className="settlement-modal__backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="settlement-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-label="Foreclosure settlement preview"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="settlement-modal__hero">
          <div className="settlement-modal__hero-text">
            <h3>Foreclosure Settlement Preview</h3>
            <p>Review the amounts before confirming foreclosure.</p>
          </div>
        </div>

        {loading && <div className="settlement-modal__muted">Loading settlement...</div>}
        {error && (
          <PopupMessage type="error" title="Error" message={error} onClose={() => setError(null)} />
        )}
        {!loading && settlement && (
          <div className="settlement-modal__body">
            <div className="settlement-modal__rows" aria-label="Settlement amounts">
              <div className="settlement-modal__row">
                <span>Outstanding Principal</span>
                <strong>INR {Number(settlement.remaining_amount || 0).toLocaleString("en-IN")}</strong>
              </div>
              <div className="settlement-modal__row">
                <span>Pending Penalties</span>
                <strong>INR {Number(settlement.pending_penalties || 0).toLocaleString("en-IN")}</strong>
              </div>
              <div className="settlement-modal__row">
                <span>Foreclosure Fee ({settlement.foreclosure_fee_percentage}%)</span>
                <strong>INR {Number(settlement.foreclosure_fee || 0).toLocaleString("en-IN")}</strong>
              </div>
            </div>

            <div className="settlement-modal__divider" role="separator" />

            <div className="settlement-modal__total">
              <span>Total Settlement</span>
              <strong>INR {Number(settlement.settlement_amount || 0).toLocaleString("en-IN")}</strong>
            </div>

            <p className="settlement-modal__note">
              By confirming, the settlement will be debited from your virtual account and the loan will be marked as
              foreclosed.
            </p>
          </div>
        )}

        <div className="settlement-modal__actions">
          <button className="settlement-modal__btn" onClick={onClose} disabled={processing}>
            Cancel
          </button>
          <button
            className="settlement-modal__btn settlement-modal__btn--danger"
            onClick={handleConfirm}
            disabled={processing || loading || showMpin}
          >
            {processing ? "Processing..." : "Confirm & Foreclose"}
          </button>
        </div>
        {showMpin && (
          <MPINVerificationModal
            onVerified={handleMpinVerified}
            onCancel={() => setShowMpin(false)}
          />
        )}
      </div>
    </div>
  );
}
