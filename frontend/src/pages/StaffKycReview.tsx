// Module: StaffKycReview
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/customerLogin.css";

type KycStatus = "pending" | "verified";
const allowedRoles = ["admin", "manager", "verification"];

const StaffKycReview = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<any[]>([]);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const staffRole = useMemo(() => localStorage.getItem("currentStaffRole"), []);
  const staffId = useMemo(() => localStorage.getItem("currentStaffId"), []);

  useEffect(() => {
    if (!staffRole || !staffId || !allowedRoles.includes(staffRole)) {
      navigate("/login");
      return;
    }
    const stored = localStorage.getItem("customers");
    const list = stored ? JSON.parse(stored) : [];
    setCustomers(list);
  }, [navigate, staffRole, staffId]);

  const getStatus = (c: any): KycStatus =>
    c?.kycStatus === "verified" ? "verified" : "pending";

  const updateStatus = (email: string, status: KycStatus) => {
    setMessage(null);
    const updated = customers.map((c: any) => {
      if (c.email !== email) return c;
      return {
        ...c,
        kycStatus: status,
        kycCompleted: status === "verified",
      };
    });
    setCustomers(updated);
    localStorage.setItem("customers", JSON.stringify(updated));
    setMessage({ type: "success", text: `KYC status updated to ${status}.` });
  };

  const handleLogout = () => {
    localStorage.removeItem("currentStaffRole");
    localStorage.removeItem("currentStaffId");
    navigate("/login");
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-container fade-in">
        <div className="dashboard-header">
          <div>
            <h2>KYC Review</h2>
            <p className="dashboard-subtitle">Role: {staffRole}</p>
          </div>
          <div className="dashboard-actions">
            <button onClick={handleLogout}>Logout</button>
          </div>
        </div>

        <section className="applications-panel">
          <div className="panel-header">
            <h3>Customers</h3>
            <span className="stat-meta">{customers.length} total</span>
          </div>

          {customers.length ? (
            customers.map((c: any) => {
              const status = getStatus(c);
              return (
                <div key={c.email} className="application-card">
                  <div>
                    <p><strong>Name:</strong> {c.name || "-"}</p>
                    <p><strong>Email:</strong> {c.email}</p>
                    <p><strong>Status:</strong> {status}</p>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <select
                      aria-label={`KYC status for ${c.email}`}
                      value={status}
                      onChange={(e) => updateStatus(c.email, e.target.value as KycStatus)}
                    >
                      <option value="pending">Pending</option>
                      <option value="verified">Verified</option>
                    </select>
                    <button onClick={() => updateStatus(c.email, status === "verified" ? "pending" : "verified")}>
                      {status === "verified" ? "Set Pending" : "Set Verified"}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty-state">
              <p>No customers found.</p>
            </div>
          )}

          {message && <div className={`form-message ${message.type}`}>{message.text}</div>}
        </section>
      </div>
    </div>
  );
};

export default StaffKycReview;
