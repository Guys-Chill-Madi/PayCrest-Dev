import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../../styles/verification.css";
import { formatISTTime } from "../../../lib/datetime";
import { adminApprovalsDashboard, adminPendingApprovals, getSession } from '../../../modules/admin/services/adminApi';
import type { LoanRow } from "./adminQueue";
import ApprovalsTab from "./tabs/ApprovalsTab";
import DataState from "../../../components/ui/DataState";

export default function AdminApprovalsPage() {
  const nav = useNavigate();
  const [pending, setPending] = useState<LoanRow[]>([]);
  const [processed, setProcessed] = useState<LoanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [last, setLast] = useState<number | null>(null);
  const [error, setError] = useState<any | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setLoading(true);
    setError(null);
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
        setLast(Date.now());
        setError(err instanceof Error ? err : new Error("Failed to load approvals dashboard (fallback to pending only)"));
      } catch (fallbackErr) {
        setError(fallbackErr instanceof Error ? fallbackErr : new Error("Failed to load approvals"));
      }
    } finally {
      setLoading(false);
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

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible" || loading || refreshing) return;
      void refresh();
    }, 15000);
    return () => window.clearInterval(timer);
  }, [loading, refreshing]);

  return (
    <div className="verification-page manager-page">
      <div className="verification-container">
        <div className="vstack">
          <div className="verification-hero">
            <div className="hero-main">
              <div className="hero-title">Approvals</div>
              <div className="hero-sub">Final approval, sanction, signature, and disbursement workflow.</div>
            </div>
            <div className="hero-actions">
              {last ? <span className="muted">Updated {formatISTTime(last)}</span> : null}
              <button className="btn primary" onClick={refresh} disabled={loading || refreshing}>
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          {error ? (
            <DataState
              variant="error"
              title="Unable to load approvals"
              message={String((error as any)?.message || error)}
              ctaLabel="Retry"
              onCta={() => {
                void refresh();
              }}
            />
          ) : null}

          <ApprovalsTab
            pending={pending}
            processed={processed}
            loading={loading}
            onRefresh={refresh}
            onReview={(collection, loanId) => nav(`/admin/review/${collection}:${loanId}`)}
            lastUpdated={last}
          />
        </div>
      </div>
    </div>
  );
}




