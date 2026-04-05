import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { verifyMPIN } from "../modules/wallet/services/walletApi";
import { useAccessibleModal } from "../hooks/useAccessibleModal";
import "../styles/verification.css";

interface MPINVerificationModalProps {
  onVerified: (mpin: string) => void;
  onCancel: () => void;
}

const MPIN_LOCK_STORAGE_KEY = "mpin_lock_until";
const DEFAULT_LOCK_MINUTES = 5;

function parseLockMinutes(message: string): number | null {
  const text = String(message || "");
  const patterns = [
    /try again in\s+(\d+)\s+minute/i,
    /locked for\s+(\d+)\s+minute/i,
    /(\d+)\s+minute\(s\)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return null;
}

function readLockUntil(): number | null {
  try {
    const raw = localStorage.getItem(MPIN_LOCK_STORAGE_KEY);
    if (!raw) return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return null;
    if (n <= Date.now()) {
      localStorage.removeItem(MPIN_LOCK_STORAGE_KEY);
      return null;
    }
    return n;
  } catch {
    return null;
  }
}

function clearLockStorage() {
  try {
    localStorage.removeItem(MPIN_LOCK_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export default function MPINVerificationModal({ onVerified, onCancel }: MPINVerificationModalProps) {
  const [mpin, setMpin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [shake, setShake] = useState(false);
  const [lockUntil, setLockUntil] = useState<number | null>(() => readLockUntil());
  const [tick, setTick] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const verifyTimerRef = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const locked = useMemo(() => (lockUntil ? lockUntil > Date.now() : false), [lockUntil, tick]);

  const remainingLabel = useMemo(() => {
    if (!lockUntil) return "";
    const ms = Math.max(0, lockUntil - Date.now());
    const totalSec = Math.ceil(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    const mm = String(min).padStart(2, "0");
    const ss = String(sec).padStart(2, "0");
    return `${mm}:${ss}`;
  }, [lockUntil, tick]);

  const handleModalClose = useCallback(() => {
    if (!submitting) onCancel();
  }, [submitting, onCancel]);

  useAccessibleModal(panelRef, true, handleModalClose);

  useEffect(() => {
    const id = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 30);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    return () => {
      if (verifyTimerRef.current) window.clearTimeout(verifyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!lockUntil) return;
    if (lockUntil <= Date.now()) {
      setLockUntil(null);
      clearLockStorage();
      return;
    }
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [lockUntil]);

  const handleChange = (v: string) => {
    if (submitting || showSuccess) return;
    setMpin(v.replace(/\D/g, "").slice(0, 4));
  };

  const triggerShake = () => {
    setShake(false);
    window.setTimeout(() => setShake(true), 0);
    window.setTimeout(() => setShake(false), 420);
  };

  const handleVerify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    setShowSuccess(false);

    if (locked) {
      setMpin("");
      setError(`Too many failed attempts. Try again in ${remainingLabel}.`);
      triggerShake();
      return;
    }

    if (mpin.length !== 4) {
      setError("Enter your 4-digit M-PIN");
      triggerShake();
      return;
    }

    setSubmitting(true);
    try {
      await verifyMPIN(mpin);
      setLockUntil(null);
      clearLockStorage();
      setError(null);
      setShowSuccess(true);
      verifyTimerRef.current = window.setTimeout(() => {
        setMpin("");
        onVerified(mpin);
      }, 420);
    } catch (err) {
      const anyErr: any = err as any;
      const status = Number(anyErr?.status || 0);
      const human = String(anyErr?.humanMessage || anyErr?.message || "Verification failed");
      setMpin("");
      triggerShake();

      if (status === 429) {
        const minutes = parseLockMinutes(human) ?? DEFAULT_LOCK_MINUTES;
        const until = Date.now() + minutes * 60 * 1000;
        setLockUntil(until);
        try {
          localStorage.setItem(MPIN_LOCK_STORAGE_KEY, String(until));
        } catch {}
        setError(`Too many failed attempts. Try again in ${minutes} minute(s).`);
        return;
      }

      setError("Incorrect M-PIN");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="mpin-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mpin-title"
      aria-describedby="mpin-description"
      aria-label="Verify M-PIN"
    >
      <div className="mpin-modal__backdrop" onClick={() => (submitting ? null : onCancel())} />
      <div className="mpin-modal__panel" ref={panelRef} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <div className="mpin-modal__head">
          <h2 id="mpin-title" className="mpin-modal__title">
            Verify M-PIN
          </h2>
          <p id="mpin-description" className="mpin-modal__sub">
            Enter your 4-digit M-PIN to continue
          </p>
        </div>

        <form className="mpin-modal__body" onSubmit={handleVerify}>
          <div className="mpin-modal__show-wrap">
            <button
              type="button"
              className="mpin-modal__show-btn"
              onClick={() => setShowAll((v) => !v)}
              disabled={submitting || showSuccess}
            >
              {showAll ? "Hide" : "Show"}
            </button>
          </div>
          <div className={`mpin-modal__digits ${shake ? "is-shake" : ""}`}>
            <input
              ref={inputRef}
              className="mpin-modal__input"
              type={showAll ? "text" : "password"}
              inputMode="numeric"
              maxLength={4}
              value={mpin}
              onChange={(e) => handleChange(e.target.value)}
              disabled={submitting || showSuccess}
              aria-label="Enter 4-digit M-PIN"
              autoComplete="one-time-code"
              placeholder="Enter 4-digit M-PIN"
            />
          </div>

          {locked ? <p className="mpin-modal__helper mpin-modal__helper--error">M-PIN locked. Try again in {remainingLabel}.</p> : null}
          {!locked && error ? <p className="mpin-modal__helper mpin-modal__helper--error">{error}</p> : null}
          {showSuccess ? (
            <p className="mpin-modal__helper mpin-modal__helper--success">
              <span className="mpin-modal__tick" aria-hidden="true">{"\u2713"}</span>
              Verified
            </p>
          ) : null}

          <div className="mpin-modal__actions">
            <button type="submit" className="mpin-modal__btn mpin-modal__btn--primary" disabled={submitting || locked || mpin.length !== 4 || showSuccess}>
              {submitting ? "Verifying..." : "Verify"}
            </button>
            <button type="button" className="mpin-modal__btn" onClick={onCancel} disabled={submitting}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
