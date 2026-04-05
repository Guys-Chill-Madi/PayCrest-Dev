// Module: StaffLogin
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/customerLogin.css";

const allowedRoles = ["admin", "manager", "verification"] as const;
type StaffRole = (typeof allowedRoles)[number];

const StaffLogin = () => {
  const navigate = useNavigate();
  const { role } = useParams();
  const [staffId, setStaffId] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const staffRole = useMemo(() => {
    if (!role) return null;
    return allowedRoles.includes(role as StaffRole) ? (role as StaffRole) : null;
  }, [role]);

  const targetDashboard = useMemo(() => {
    if (staffRole === "admin") return "/admin";
    if (staffRole === "manager") return "/manager";
    if (staffRole === "verification") return "/verification";
    return "/login";
  }, [staffRole]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!staffRole) {
      setMessage({ type: "error", text: "Invalid role. Please select a role again." });
      return;
    }
    if (!staffId || !password) {
      setMessage({ type: "error", text: "Enter staff ID and password." });
      return;
    }
    localStorage.setItem("currentStaffRole", staffRole);
    localStorage.setItem("currentStaffId", staffId);
    setMessage({ type: "success", text: "Login successful. Redirecting..." });
    window.setTimeout(() => navigate(targetDashboard), 600);
  };

  return (
    <div className="customer-page">
      <div className="customer-container fade-in">
        <h2>{staffRole === "admin" ? "Admin Portal" : staffRole === "manager" ? "Manager Portal" : "Verification Portal"}</h2>
        <p style={{ textAlign: "center", marginBottom: 16, color: "#475569", fontSize: "14px" }}>
          Access Level: <strong style={{ color: "#1e3a8a" }}>{staffRole ? staffRole.charAt(0).toUpperCase() + staffRole.slice(1) : "Unknown"}</strong>
        </p>
        <form className="customer_form" onSubmit={handleSubmit}>
          <label style={{ display: "block", textAlign: "left", marginBottom: "6px", color: "#475569", fontSize: "13px", fontWeight: "500" }}>Staff ID</label>
          <input name="staffId" value={staffId} onChange={(e) => setStaffId(e.target.value)} placeholder="Enter your staff ID" required />
          <label style={{ display: "block", textAlign: "left", marginBottom: "6px", color: "#475569", fontSize: "13px", fontWeight: "500", marginTop: "8px" }}>Password</label>
          <input name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required />
          <button type="submit" style={{ marginTop: "12px" }}>Login</button>
          {message && <div className={`form-message ${message.type}`}>{message.text}</div>}
        </form>
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button 
            type="button"
            onClick={() => navigate("/login")}
            style={{
              background: "transparent",
              border: "none",
              color: "#2563eb",
              fontWeight: "600",
              cursor: "pointer",
              textDecoration: "underline",
              fontSize: "14px",
              padding: "0"
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#1e3a8a")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#2563eb")}
          >
            ← Back to Role Selection
          </button>
        </div>
      </div>
    </div>
  );
};

export default StaffLogin;
