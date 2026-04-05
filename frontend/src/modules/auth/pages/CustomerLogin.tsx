// Module: CustomerLogin
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../../../styles/customerLogin.css";
import { forgotPasswordWithPan, login, normalizeRole, setSession, type AppRole } from "../../../modules/auth/services/authApi";

type LoginRole = AppRole;

function sanitizeErrorText(s: string) {
  let t = String(s || "").trim();
  // remove status prefixes like '401 Unauthorized:'
  t = t.replace(/^\s*\d{3}\s+[^:]*:\s*/i, "");
  // remove parenthesized urls like '(http://localhost:8010/...)'
  t = t.replace(/\s*\(https?:\/\/[^)]+\)\s*/gi, "").trim();
  return t || "Login failed";
}

const CustomerLogin = () => {
  const navigate = useNavigate();
  const params = useParams();
  const logoSrc = new URL("../../../styles/paycrest-logo.png", import.meta.url).href;
  const [role, setRole] = useState<LoginRole>("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotPan, setForgotPan] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    const paramRole = normalizeRole(params.role);
    if (paramRole) {
      setRole(paramRole);
    }
  }, [params.role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setMessage(null);
    setLoading(true);
    try {
      const token = await login(email, password);
      const normalized = normalizeRole(token.role) || token.role;
      if (normalized !== role) {
        setMessage({ type: "error", text: `Role mismatch. You logged in as ${normalized}.` });
        setLoading(false);
        return;
      }
      setSession({ accessToken: token.access_token, role: normalized as AppRole, userId: token.user_id, mpinSet: token.mpin_set });
      const targetDashboard =
        normalized === "admin"
          ? "/admin"
          : normalized === "manager"
            ? "/manager"
            : normalized === "verification"
              ? "/verification"
              : normalized === "customer" && !token.mpin_set
                ? "/mpin-setup"
                : "/dashboard";
      setMessage({ type: "success", text: "Login successful. Redirecting..." });
      window.setTimeout(() => navigate(targetDashboard), 600);
    } catch (err) {
      const anyErr = err as any;
      const raw = String(anyErr?.humanMessage || (err instanceof Error ? err.message : "Login failed"));
      setMessage({ type: "error", text: sanitizeErrorText(raw) });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotLoading) return;
    setMessage(null);

    const pan = forgotPan.trim().toUpperCase();
    if (!forgotEmail.trim()) {
      setMessage({ type: "error", text: "Email is required" });
      return;
    }
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
      setMessage({ type: "error", text: "Enter PAN in format ABCDE1234F" });
      return;
    }
    if (forgotNewPassword.length < 8) {
      setMessage({ type: "error", text: "New password must be at least 8 characters" });
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setMessage({ type: "error", text: "New password and confirm password do not match" });
      return;
    }

    setForgotLoading(true);
    try {
      const resp = await forgotPasswordWithPan({
        email: forgotEmail.trim(),
        pan_number: pan,
        new_password: forgotNewPassword,
        confirm_password: forgotConfirmPassword,
      });
      setEmail(forgotEmail.trim());
      setPassword("");
      setShowForgot(false);
      setForgotPan("");
      setForgotNewPassword("");
      setForgotConfirmPassword("");
      setMessage({ type: "success", text: resp?.message || "Password reset successful. Please log in." });
    } catch (err) {
      const anyErr = err as any;
      const raw = String(anyErr?.humanMessage || (err instanceof Error ? err.message : "Password reset failed"));
      setMessage({ type: "error", text: sanitizeErrorText(raw) });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="customer-page">
      <div className="customer-container fade-in">
        <div className="form-brand">
          <img src={logoSrc} alt="PayCrest" />
          <span>PayCrest</span>
        </div>
        <h2>{role === "customer" ? "Customer Login" : role === "admin" ? "Admin Portal" : role === "manager" ? "Manager Portal" : "Verification Portal"}</h2>
        <form className="customer_form" onSubmit={handleSubmit}>
          <label htmlFor="role-select" style={{ display: "block", textAlign: "left", marginBottom: "8px", color: "#475569", fontSize: "14px", fontWeight: "500" }}>Select User Role</label>
          <select
            id="role-select"
            name="role"
            value={role}
            onChange={(e) => {
              setRole(e.target.value as LoginRole);
              setMessage(null);
            }}
            required
          >
            <option value="" disabled>Choose your role</option>
            <option value="customer">Customer</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="verification">Verification Team</option>
          </select>

          <label htmlFor="email-input" style={{ display: "block", textAlign: "left", marginBottom: "8px", color: "#475569", fontSize: "14px", fontWeight: "500", marginTop: "8px" }}>Email Address</label>
          <input
            id="email-input"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
          />

          <label htmlFor="password-input" style={{ display: "block", textAlign: "left", marginBottom: "8px", color: "#475569", fontSize: "14px", fontWeight: "500", marginTop: "8px" }}>Password</label>
          <input
            id="password-input"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />

          <button type="submit" disabled={loading} style={{ marginTop: "8px" }}>
            {loading ? "Signing in..." : "Login"}
          </button>
          {message && <div className={`form-message ${message.type}`}>{message.text}</div>}
        </form>
        {role === "customer" && (
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <button
              className="forgot-password-link"
              type="button"
              onClick={() => {
                setShowForgot((v) => !v);
                setMessage(null);
                if (!forgotEmail.trim() && email.trim()) {
                  setForgotEmail(email.trim());
                }
              }}
            >
              {showForgot ? "Hide Forgot Password" : "Forgot Password?"}
            </button>

            {showForgot && (
              <form className="forgot-password-panel" onSubmit={handleForgotPassword}>
                <label htmlFor="forgot-email">Email Address</label>
                <input
                  id="forgot-email"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="Enter your registered email"
                  required
                />
                <label htmlFor="forgot-pan">PAN Number</label>
                <input
                  id="forgot-pan"
                  value={forgotPan}
                  onChange={(e) => setForgotPan(e.target.value.toUpperCase())}
                  placeholder="ABCDE1234F"
                  required
                  maxLength={10}
                />
                <label htmlFor="forgot-new-password">New Password</label>
                <input
                  id="forgot-new-password"
                  type="password"
                  value={forgotNewPassword}
                  onChange={(e) => setForgotNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  required
                  minLength={8}
                />
                <label htmlFor="forgot-confirm-password">Confirm New Password</label>
                <input
                  id="forgot-confirm-password"
                  type="password"
                  value={forgotConfirmPassword}
                  onChange={(e) => setForgotConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                  minLength={8}
                />
                <button type="submit" disabled={forgotLoading}>
                  {forgotLoading ? "Updating..." : "Reset Password"}
                </button>
              </form>
            )}

            <p style={{ margin: "12px 0 8px 0", color: "#475569", fontSize: "14px" }}>New to PayCrest?</p>
            <button 
              className="create-account-link"
              type="button"
              onClick={() => navigate("/register/customer")} 
              style={{
                background: "transparent",
                border: "none",
                color: "#2563eb",
                fontWeight: "600",
                cursor: "pointer",
                textDecoration: "underline",
                fontSize: "15px",
                padding: "0"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#1e3a8a")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#2563eb")}
            >
              Create an Account
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerLogin;



