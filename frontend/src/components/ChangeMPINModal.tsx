import { useRef, useState } from "react";
import { changeMyPassword, login, setSession } from "../modules/auth/services/authApi";
import { resetMPIN, resetMPINWithPassword } from "../modules/wallet/services/walletApi";
import { useAccessibleModal } from "../hooks/useAccessibleModal";
import "../styles/verification.css";
import "../styles/change-mpin-modal.css";
import PopupMessage from "./PopupMessage";

export default function ChangeMPINModal({
  email,
  onClose,
  onSuccess,
}: {
  email: string;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [mode, setMode] = useState<"password" | "old_mpin" | "change_password">("change_password");
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [oldMpin, setOldMpin] = useState<string[]>(["", "", "", ""]);
  const [newMpin, setNewMpin] = useState<string[]>(["", "", "", ""]);
  const [confirmMpin, setConfirmMpin] = useState<string[]>(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const refsOld = useRef<Array<HTMLInputElement | null>>([]);
  const refsNew = useRef<Array<HTMLInputElement | null>>([]);
  const refsConf = useRef<Array<HTMLInputElement | null>>([]);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const valToStr = (arr: string[]) => arr.join("");

  const newStr = valToStr(newMpin);
  const confStr = valToStr(confirmMpin);
  const oldStr = valToStr(oldMpin);
  const newMatch = newStr.length === 4 && newStr === confStr;
  const passwordMatch = newPassword.length >= 8 && newPassword === confirmPassword;
  const canSubmit =
    mode === "change_password"
      ? !loading && !!currentPassword && passwordMatch
      : !loading && newStr.length === 4 && newMatch && (mode === "password" ? !!password : oldStr.length === 4);

  useAccessibleModal(panelRef, true, () => {
    if (!loading) onClose();
  });

  const handleSeqChange = (
    idx: number,
    v: string,
    arrSetter: (s: string[]) => void,
    arr: string[],
    refs: React.MutableRefObject<Array<HTMLInputElement | null>>,
  ) => {
    const digit = v.replace(/\D/g, "").slice(0, 1);
    const copy = [...arr];
    copy[idx] = digit;
    arrSetter(copy);
    if (digit) {
      // Move focus after React flushes state to avoid focus jumping to tab buttons.
      window.requestAnimationFrame(() => {
        const next = refs.current[idx + 1];
        if (next) next.focus();
      });
    }
  };

  const handleKeyDownSeq = (
    e: React.KeyboardEvent<HTMLInputElement>,
    idx: number,
    arrSetter: (s: string[]) => void,
    arr: string[],
    refs: React.MutableRefObject<Array<HTMLInputElement | null>>,
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      return;
    }
    if (e.key === "Backspace") {
      const target = e.currentTarget;
      if (target.value) return;
      const prev = refs.current[idx - 1];
      if (prev) {
        prev.focus();
        const copy = [...arr];
        copy[idx - 1] = "";
        arrSetter(copy);
      }
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    setNotice(null);

    if (mode === "change_password") {
      if (!currentPassword) {
        setError("Enter your current password");
        return;
      }
      if (newPassword.length < 8) {
        setError("New password must be at least 8 characters");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("New password and confirmation do not match");
        return;
      }
      setLoading(true);
      try {
        await changeMyPassword({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        });
        setNotice("Password changed successfully");
        setTimeout(() => {
          onSuccess && onSuccess();
          onClose();
        }, 1200);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to change password"));
      } finally {
        setLoading(false);
      }
      return;
    }

    const nextNew = valToStr(newMpin);
    const nextConf = valToStr(confirmMpin);
    if (nextNew.length !== 4) {
      setError("Enter a 4-digit new M-PIN");
      return;
    }
    if (nextNew !== nextConf) {
      setError("New M-PIN and confirmation do not match");
      return;
    }

    setLoading(true);
    try {
      if (mode === "old_mpin") {
        const nextOld = valToStr(oldMpin);
        if (nextOld.length !== 4) {
          setError("Enter your current 4-digit M-PIN");
          setLoading(false);
          return;
        }
        await resetMPIN(nextOld, nextNew, nextConf);
      } else {
        if (!email || !password) {
          setError("Email and password required");
          setLoading(false);
          return;
        }
        const resp = await login(email, password);
        try {
          setSession({
            accessToken: resp.access_token,
            role: resp.role,
            userId: String(resp.user_id),
            mpinSet: resp.mpin_set,
          });
        } catch {
          // ignore session set failures
        }
        await resetMPINWithPassword(password, nextNew, nextConf);
      }

      setNotice("M-PIN changed successfully");
      setTimeout(() => {
        onSuccess && onSuccess();
        onClose();
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to change M-PIN"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="change-mpin-modal__backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="change-mpin-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-mpin-title"
        ref={panelRef}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="change-mpin-modal__header">
          <div>
            <h3 id="change-mpin-title" className="change-mpin-modal__title">
              {mode === "change_password" ? "Change Password" : "Change M-PIN"}
            </h3>
            <p className="change-mpin-modal__sub">
              {mode === "change_password"
                ? "Update your account password securely using your current password."
                : "Securely update your 4-digit M-PIN. Use your account password or current M-PIN to authenticate."}
            </p>
          </div>
        </div>

        {notice ? (
          <div className="form-message success" style={{ marginBottom: 12 }}>
            {notice}
          </div>
        ) : null}
        {error ? <PopupMessage type="error" title="Error" message={error} onClose={() => setError(null)} /> : null}

        <div className="change-mpin-modal__tabs" role="tablist" aria-label="Authentication mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "password"}
            className={`change-mpin-modal__tab ${mode === "password" ? "is-active" : ""}`}
            onClick={() => setMode("password")}
          >
            Use Password
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "old_mpin"}
            className={`change-mpin-modal__tab ${mode === "old_mpin" ? "is-active" : ""}`}
            onClick={() => setMode("old_mpin")}
          >
            Use Current M-PIN
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "change_password"}
            className={`change-mpin-modal__tab ${mode === "change_password" ? "is-active" : ""}`}
            onClick={() => setMode("change_password")}
          >
            Change Password
          </button>
        </div>

        <form onSubmit={handleSubmit} className="change-mpin-modal__form">
          {mode === "change_password" ? (
            <fieldset className="change-mpin-modal__field">
              <label className="change-mpin-modal__label">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="change-mpin-modal__input"
                aria-label="Current password"
              />

              <div style={{ marginTop: 12 }}>
                <label className="change-mpin-modal__label">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 8 characters)"
                  className="change-mpin-modal__input"
                  aria-label="New password"
                />
              </div>

              <div style={{ marginTop: 12 }}>
                <label className="change-mpin-modal__label">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="change-mpin-modal__input"
                  aria-label="Confirm new password"
                />
              </div>

              {!passwordMatch && newPassword.length > 0 && confirmPassword.length > 0 ? (
                <div className="form-message error" style={{ marginTop: 8 }}>
                  New password and confirmation do not match.
                </div>
              ) : null}
            </fieldset>
          ) : null}

          {mode === "password" ? (
            <fieldset className="change-mpin-modal__field">
              <label className="change-mpin-modal__label">Account Email</label>
              <input type="email" value={email} disabled aria-disabled className="change-mpin-modal__input" />

              <div style={{ marginTop: 12 }}>
                <label className="change-mpin-modal__label">Account Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your account password"
                  className="change-mpin-modal__input"
                  aria-label="Account password"
                />
              </div>
            </fieldset>
          ) : null}

          {mode === "old_mpin" ? (
            <fieldset className="change-mpin-modal__field">
              <label className="change-mpin-modal__label">Current M-PIN</label>
              <div className="change-mpin-modal__digits-row">
                {oldMpin.map((v, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      refsOld.current[i] = el;
                    }}
                    className="change-mpin-modal__digit"
                    type={showAll ? "text" : "password"}
                    inputMode="numeric"
                    maxLength={1}
                    value={v}
                    onChange={(e) => handleSeqChange(i, e.target.value, setOldMpin, oldMpin, refsOld)}
                    onKeyDown={(e) => handleKeyDownSeq(e, i, setOldMpin, oldMpin, refsOld)}
                    onFocus={(e) => e.currentTarget.select()}
                    aria-label={`Current M-PIN digit ${i + 1}`}
                  />
                ))}
                <button
                  type="button"
                  className="change-mpin-modal__toggle"
                  onClick={() => setShowAll((s) => !s)}
                  aria-pressed={showAll}
                >
                  {showAll ? "Hide" : "Show"}
                </button>
              </div>
            </fieldset>
          ) : null}

          {mode !== "change_password" ? (
            <fieldset className="change-mpin-modal__field">
              <label className="change-mpin-modal__label">New M-PIN</label>
              <div className="change-mpin-modal__digits-row">
                {newMpin.map((v, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      refsNew.current[i] = el;
                    }}
                    className="change-mpin-modal__digit"
                    type={showAll ? "text" : "password"}
                    inputMode="numeric"
                    maxLength={1}
                    value={v}
                    onChange={(e) => handleSeqChange(i, e.target.value, setNewMpin, newMpin, refsNew)}
                    onKeyDown={(e) => handleKeyDownSeq(e, i, setNewMpin, newMpin, refsNew)}
                    onFocus={(e) => e.currentTarget.select()}
                    aria-label={`New M-PIN digit ${i + 1}`}
                  />
                ))}
              </div>

              <div style={{ marginTop: 12 }}>
                <label className="change-mpin-modal__label">Confirm New M-PIN</label>
                <div className="change-mpin-modal__digits-row">
                  {confirmMpin.map((v, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        refsConf.current[i] = el;
                      }}
                      className="change-mpin-modal__digit"
                      type={showAll ? "text" : "password"}
                      inputMode="numeric"
                      maxLength={1}
                      value={v}
                      onChange={(e) => handleSeqChange(i, e.target.value, setConfirmMpin, confirmMpin, refsConf)}
                      onKeyDown={(e) => handleKeyDownSeq(e, i, setConfirmMpin, confirmMpin, refsConf)}
                      onFocus={(e) => e.currentTarget.select()}
                      aria-label={`Confirm M-PIN digit ${i + 1}`}
                    />
                  ))}
                  <button
                    type="button"
                    className="change-mpin-modal__toggle"
                    onClick={() => setShowAll((s) => !s)}
                    aria-pressed={showAll}
                  >
                    {showAll ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {!newMatch && newStr.length > 0 && confStr.length > 0 ? (
                <div className="form-message error" style={{ marginTop: 8 }}>
                  New M-PIN and confirmation do not match.
                </div>
              ) : null}
            </fieldset>
          ) : null}

          <div className="change-mpin-modal__actions">
            <button type="button" className="change-mpin-modal__btn" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button
              type="submit"
              className="change-mpin-modal__btn change-mpin-modal__btn--primary"
              disabled={!canSubmit}
              aria-disabled={!canSubmit}
            >
              {loading ? "Updating..." : mode === "change_password" ? "Change Password" : "Change M-PIN"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
