import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "../../../components/BackButton";
import "../../../styles/verification.css";
import { formatISTTime } from "../../../lib/datetime";
import {
  adminApprovalsDashboard,
  adminPendingApprovals,
  getSession,
} from '../../../modules/admin/services/adminApi';
import ApprovalsTab from "./tabs/ApprovalsTab";
import StaffManagementTab from "./tabs/StaffManagementTab";
import SettingsTab from "./tabs/SettingsTab";
import AuditTab from "./tabs/AuditTab";

export type LoanRow = {
  loan_id?: number | string;
  _id?: string;
  customer_id?: string | number;
  full_name?: string;
  loan_amount?: number;
  tenure_months?: number;
  status?: string;
  applied_at?: string | number;
  vehicle_type?: string;
  vehicle_model?: string;
  vehicle_price_doc?: string;
};

type TabKey = "approvals" | "staff" | "settings";
// add audit logs tab
type TabKeyExtended = TabKey | "audit";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabKeyExtended>("approvals");

  const [pending, setPending] = useState<LoanRow[]>([]);
  const [processed, setProcessed] = useState<LoanRow[]>([]);
  const [pendingLoading, setPendingLoading] = useState<boolean>(true);
  const [last, setLast] = useState<number | null>(null);
  const [refreshError, setRefreshError] = useState<any | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const nav = useNavigate();
  const logoUrl = new URL("../../../styles/paycrest-logo.png", import.meta.url).href;

  const refresh = async () => {
    if (refreshing) return; // Prevent multiple simultaneous refreshes
    setRefreshing(true);
    setPendingLoading(true);
    setRefreshError(null);
    try {
      const data = await adminApprovalsDashboard(30);
      setPending((data?.pending_approvals || []) as LoanRow[]);
      setProcessed((data?.processed_approvals || []) as LoanRow[]);
      setLast(Date.now());
    } catch (err) {
      try {
        const loans = await adminPendingApprovals();
        setPending((loans || []) as LoanRow[]);
        setProcessed([]);
        setRefreshError(
          err instanceof Error
            ? `${err.message} (falling back to pending queue)`
            : "Failed to load approvals dashboard (falling back to pending queue)",
        );
      } catch (fallbackErr) {
        setRefreshError(fallbackErr instanceof Error ? fallbackErr.message : "Failed to load approvals");
      }
    } finally {
      setPendingLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== "admin") {
      nav("/login/staff/admin");
      return;
    }
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tabs: Array<{ key: TabKeyExtended; label: string }> = [
    { key: "approvals", label: "Approvals" },
    { key: "staff", label: "Staff Management" },
    { key: "audit", label: "Audit Logs" },
    { key: "settings", label: "Settings" },
  ];

  return (
    <div className="verification-page">
      <div className="verification-container">
        <div className="vstack">
          <div className="verification-hero">
            <div className="hero-main">
              <div className="brand">
                <img src={logoUrl} alt="PayCrest" className="brand-logo" />
                <div>
                  <div className="brand-title">PayCrest</div>
                </div>
              </div>
              <div className="hero-title">Admin Dashboard</div>
              <div className="hero-sub">Approve loans and manage staff/settings.</div>
            </div>
            <div className="hero-actions">
              {last ? <span className="muted">Updated {formatISTTime(last)}</span> : null}
              <BackButton className="btn back" fallback="/login" />
              <button className="btn primary" onClick={refresh} disabled={pendingLoading || refreshing}>{refreshing ? "Refreshing…" : "Refresh"}</button>
            </div>
          </div>

          <div className="tab-bar" role="tablist" aria-label="Admin dashboard tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`tab-button ${activeTab === tab.key ? "active" : ""}`}
                role="tab"
                aria-selected={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {refreshError && <div className="form-message error">{refreshError}</div>}

          {activeTab === "approvals" && (
            <ApprovalsTab
              pending={pending}
              processed={processed}
              loading={pendingLoading}
              onRefresh={refresh}
              onReview={(collection, loanId) => nav(`/admin/review/${collection}:${loanId}`)}
              lastUpdated={last}
            />
          )}
          {activeTab === "audit" && <AuditTab />}
          {activeTab === "staff" && <StaffManagementTab />}
          {activeTab === "settings" && <SettingsTab />}
        </div>
      </div>
    </div>
  );
}




