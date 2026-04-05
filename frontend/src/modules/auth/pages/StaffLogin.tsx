import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DataState from "../../../components/ui/DataState";
import "../../../styles/staff-login.css";

const StaffLogin = () => {
  const navigate = useNavigate();
  const params = useParams();
  const role = (params.role || "").toLowerCase();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const logoUrl = new URL("../../../styles/paycrest-logo.png", import.meta.url).href;

  const roleLabel = useMemo(() => {
    if (role === "admin") return "Admin";
    if (role === "manager") return "Manager";
    return "Verification";
  }, [role]);

  const targetRoute = useMemo(() => {
    if (role === "admin") return "/admin";
    if (role === "manager") return "/manager";
    return "/verification";
  }, [role]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!role) {
      setMessage({ type: "error", text: "Invalid role. Please return to role selection." });
      return;
    }
    localStorage.setItem("currentStaffRole", role);
    localStorage.setItem("currentStaffEmail", email || `${role}@paycrest.local`);
    setMessage({ type: "success", text: "Login successful. Redirecting..." });
    window.setTimeout(() => navigate(targetRoute), 500);
  };

  return (
    <div className="staff-auth-page">
      <div className="staff-auth-shell">
        <section className="staff-auth-panel" aria-label={`${roleLabel} secure login`}>
          <div className="staff-auth-brand">
            <img src={logoUrl} alt="PayCrest" />
            <div>
              <strong>PayCrest Ops</strong>
              <span>Secure role-based access</span>
            </div>
          </div>

          <div className="staff-auth-head">
            <h2>{roleLabel} Login</h2>
            <p>Use your authorized work credentials to access approval workflows.</p>
          </div>

          <div className="staff-auth-badges" aria-label="Trust indicators">
            <span className="ds-badge ds-badge--verified">M-PIN protected actions</span>
            <span className="ds-badge ds-badge--verified">Audit logs enabled</span>
            <span className="ds-badge ds-badge--verified">Session monitoring active</span>
          </div>

          <form className="staff-auth-form" onSubmit={handleSubmit}>
            <label>
              Work Email
              <input
                className="ds-input"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@paycrest.com"
                autoComplete="email"
                required
              />
            </label>

            <label>
              Password
              <input
                className="ds-input"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                required
              />
            </label>

            <button className="ds-btn ds-btn--primary staff-auth-submit" type="submit">
              Login to {roleLabel}
            </button>
          </form>

          {message ? (
            <DataState
              variant={message.type === "error" ? "error" : "success"}
              title={message.type === "error" ? "Login failed" : "Login successful"}
              message={message.text}
            />
          ) : null}
        </section>

        <section className="staff-auth-side ds-card" aria-label="Security notes">
          <h3>Before You Continue</h3>
          <ul>
            <li>Verify your role and branch context before approving loans.</li>
            <li>High-value approvals require additional verification steps.</li>
            <li>All actions are recorded in the audit timeline.</li>
          </ul>
          {!role ? (
            <DataState
              variant="error"
              title="Role not found"
              message="Open this screen from role selection. Example: /login/staff/manager"
            />
          ) : null}
        </section>
      </div>
    </div>
  );
};

export default StaffLogin;



