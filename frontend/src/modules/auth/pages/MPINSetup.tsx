import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSession, setSession } from "../../../modules/auth/services/authApi";
import { setupMPIN } from "../../../modules/wallet/services/walletApi";
import PopupMessage from "../../../components/PopupMessage";
import "../../../styles/verification.css";

export default function MPINSetup() {
  const [mpin, setMpin] = useState("");
  const [confirmMpin, setConfirmMpin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<any | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const nav = useNavigate();
  const logoUrl = new URL("../../../styles/paycrest-logo.png", import.meta.url).href;

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== "customer") {
      nav("/login");
      return;
    }

    // If M-PIN is already set, send user to login (they don't need setup page)
    if (session.mpinSet) {
      nav("/login");
      return;
    }
  }, [nav]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    // Validate inputs
    if (!mpin.trim()) {
      setError("M-PIN is required");
      return;
    }
    if (!confirmMpin.trim()) {
      setError("Confirmation M-PIN is required");
      return;
    }
    if (!/^\d{4}$/.test(mpin)) {
      setError("M-PIN must be exactly 4 digits");
      return;
    }
    if (mpin !== confirmMpin) {
      setError("M-PINs do not match");
      return;
    }

    setSubmitting(true);
    try {
      await setupMPIN(mpin, confirmMpin);
      // Update session to mark MPIN as set
      const session = getSession();
      if (session) {
        setSession({ ...session, mpinSet: true });
      }
      setNotice("M-PIN set up successfully!");
      // Show centered success popup then redirect to login
      setTimeout(() => {
        setNotice(null);
        nav("/login");
      }, 1400);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to set up M-PIN"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="verification-page">
      <div className="verification-container">
        <div className="verification-hero verification-hero--compact">
          <div className="hero-main">
            <div className="brand">
              <img src={logoUrl} alt="PayCrest" className="brand-logo" />
              <div>
                <div className="brand-title">PayCrest</div>
                <div className="brand-sub">Secure Your Account</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <div className="card" style={{ marginTop: 24 }}>
            <div className="card-head">
              <div>
                <h3>Set Up Your M-PIN</h3>
                <p className="muted">
                  Create a 4-digit PIN for secure wallet transactions. You'll need this to add money and verify sensitive actions.
                </p>
              </div>
            </div>

            <div style={{ padding: "0 18px 18px" }}>
              {notice && (
                <PopupMessage
                  type="success"
                  title="Success"
                  message={notice}
                  onClose={() => {
                    setNotice(null);
                    nav("/login");
                  }}
                />
              )}
              {error && (
                <PopupMessage type="error" title="Error" message={error} onClose={() => setError(null)} />
              )}

              <form className="vstack" style={{ gap: 16, marginTop: 18 }} onSubmit={handleSetup}>
                <div className="form-field">
                  <label>Create Your M-PIN (4 digits)</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={mpin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setMpin(val);
                    }}
                    placeholder="0 0 0 0"
                    disabled={submitting}
                    style={{ fontSize: 24, letterSpacing: "12px", textAlign: "center" }}
                  />
                  <span className="muted" style={{ fontSize: 12 }}>
                    Use any 4 digits. Don't share with anyone.
                  </span>
                </div>

                <div className="form-field">
                  <label>Confirm Your M-PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={confirmMpin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setConfirmMpin(val);
                    }}
                    placeholder="0 0 0 0"
                    disabled={submitting}
                    style={{ fontSize: 24, letterSpacing: "12px", textAlign: "center" }}
                  />
                </div>

                {mpin.length === 4 && mpin === confirmMpin && (
                  <div
                    style={{
                      padding: 12,
                      backgroundColor: "#ecfdf5",
                      border: "1px solid #bbf7d0",
                      borderRadius: 8,
                      color: "#15803d",
                      fontSize: 13,
                    }}
                  >
                    ✓ M-PINs match
                  </div>
                )}

                <button
                  type="submit"
                  className="btn primary"
                  disabled={submitting || mpin.length !== 4 || mpin !== confirmMpin}
                  style={{ width: "100%" }}
                >
                  {submitting ? "Setting Up…" : "Set Up M-PIN"}
                </button>
              </form>

              <div
                style={{
                  marginTop: 20,
                  padding: 12,
                  backgroundColor: "#f0f9ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: 8,
                  fontSize: 13,
                  color: "#1e3a8a",
                }}
              >
                <strong>💡 Security Tip:</strong>
                <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
                  <li>Use a PIN you remember easily but isn't obvious (avoid 1234, 0000, etc.)</li>
                  <li>Never share your M-PIN with anyone, including PayCrest staff</li>
                  <li>You can change your M-PIN later in settings</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



