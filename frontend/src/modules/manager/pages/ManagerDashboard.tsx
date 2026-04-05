import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BarChart from "../../../components/charts/BarChart";
import LineChart from "../../../components/charts/LineChart";
import PieChart from "../../../components/charts/PieChart";
import "../../../styles/verification.css";
import { formatISTDate, formatISTTime } from "../../../lib/datetime";
import { getMyProfile } from "../../../lib/api/auth";
import { getSession, managerLoans, managerPendingSignatureVerifications } from '../../../modules/manager/services/managerApi';
import { filterPendingSignatures, getLoanCollection, getRowTs, partitionManagerLoans, type LoanRow } from "./managerQueue";

export default function ManagerDashboard() {
  const nav = useNavigate();
  const [needsAssignment, setNeedsAssignment] = useState<LoanRow[]>([]);
  const [pendingReviews, setPendingReviews] = useState<LoanRow[]>([]);
  const [pendingSignatures, setPendingSignatures] = useState<LoanRow[]>([]);
  const [recent, setRecent] = useState<LoanRow[]>([]);
  const [last, setLast] = useState<number | null>(null);
  const [error, setError] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [accountName, setAccountName] = useState<string | null>(null);

  const session = getSession();
  const displayName = useMemo(() => {
    const raw = String(accountName || session?.userId || localStorage.getItem("currentStaffEmail") || "Manager");
    const base = raw.includes("@") ? raw.split("@")[0] : raw;
    const cleaned = base.replace(/[._-]+/g, " ").trim();
    if (!cleaned) return "Manager";
    if (/^\d+$/.test(cleaned)) return "Manager";
    return cleaned
      .split(" ")
      .filter(Boolean)
      .map((p) => p.slice(0, 1).toUpperCase() + p.slice(1))
      .join(" ");
  }, [accountName, session?.userId]);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const [loans, sigLoans] = await Promise.all([managerLoans(), managerPendingSignatureVerifications()]);
      const { needsAssignment: a, pendingReviews: p, recent: r } = partitionManagerLoans(loans || []);
      setNeedsAssignment(a);
      setPendingReviews(p);
      setRecent(r);
      setPendingSignatures(filterPendingSignatures(sigLoans || []));
      setLast(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load manager dashboard"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== "manager") {
      nav("/login/staff/manager");
      return;
    }
    void refresh();
    void (async () => {
      try {
        const me = await getMyProfile();
        if (me?.full_name && String(me.full_name).trim()) {
          setAccountName(String(me.full_name).trim());
        }
      } catch {
        // Keep fallback display name if profile fetch fails.
      }
    })();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible" || loading) return;
      void refresh();
    }, 15000);
    return () => window.clearInterval(timer);
  }, [loading]);

  const allLoans = useMemo(() => {
    const map = new Map<number, LoanRow>();
    [...needsAssignment, ...pendingReviews, ...pendingSignatures, ...recent].forEach((l) => {
      if (l && Number.isFinite(l.loan_id)) map.set(l.loan_id, l);
    });
    return Array.from(map.values());
  }, [needsAssignment, pendingReviews, pendingSignatures, recent]);

  const barData = useMemo(() => {
    const counts = allLoans.reduce(
      (acc, loan) => {
        const c = getLoanCollection(loan);
        if (c === "vehicle_loans") acc.vehicle += 1;
        else if (c === "home_loans") acc.home += 1;
        else if (c === "education_loans") acc.education += 1;
        else acc.personal += 1;
        return acc;
      },
      { personal: 0, vehicle: 0, home: 0, education: 0 },
    );
    return [
      { label: "Personal", value: counts.personal, color: "#3b82f6" },
      { label: "Vehicle", value: counts.vehicle, color: "#f59e0b" },
      { label: "Home", value: counts.home, color: "#06b6d4" },
      { label: "Education", value: counts.education, color: "#8b5cf6" },
    ];
  }, [allLoans]);

  const pieData = useMemo(() => {
    const counts = recent.reduce(
      (acc, loan) => {
        const s = String(loan.status || "").toLowerCase();
        if (["rejected", "foreclosed"].includes(s)) acc.rejected += 1;
        else if (
          [
            "manager_approved",
            "pending_admin_approval",
            "admin_approved",
            "sanction_sent",
            "ready_for_disbursement",
            "disbursed",
            "active",
            "completed",
          ].includes(s)
        ) {
          acc.approved += 1;
        } else {
          acc.other += 1;
        }
        return acc;
      },
      { approved: 0, rejected: 0, other: 0 },
    );
    return [
      { label: "Approved/Forwarded", value: counts.approved, color: "#22c55e" },
      { label: "Rejected", value: counts.rejected, color: "#ef4444" },
      { label: "Other", value: counts.other, color: "#60a5fa" },
    ];
  }, [recent]);

  const pendingTotal = needsAssignment.length + pendingReviews.length + pendingSignatures.length;

  const monthBuckets = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = formatISTDate(d, { month: "short" });
      return { key, label, year: d.getFullYear(), month: d.getMonth() };
    });

    const appCounts = new Map(months.map((m) => [m.key, 0]));
    allLoans.forEach((l) => {
      const raw = (l as any)?.applied_at || (l as any)?.updated_at;
      const ts = typeof raw === "number" ? raw : raw ? Date.parse(String(raw)) : NaN;
      if (!Number.isFinite(ts)) return;
      const d = new Date(ts);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!appCounts.has(key)) return;
      appCounts.set(key, (appCounts.get(key) || 0) + 1);
    });

    const completedCounts = new Map(months.map((m) => [m.key, 0]));
    recent.forEach((l) => {
      const ts = getRowTs(l);
      if (!ts) return;
      const d = new Date(ts);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!completedCounts.has(key)) return;
      completedCounts.set(key, (completedCounts.get(key) || 0) + 1);
    });

    return { months, appCounts, completedCounts };
  }, [allLoans, recent]);

  const applicationsTrend = monthBuckets.months.map((m) => ({
    label: m.label,
    value: monthBuckets.appCounts.get(m.key) || 0,
  }));

  const completedTrend = monthBuckets.months.map((m) => ({
    label: m.label,
    value: monthBuckets.completedCounts.get(m.key) || 0,
  }));

  return (
    <div className="verification-page manager-page">
      <div className="verification-container">
        <div className="vstack">
          <div className="verification-hero">
            <div className="hero-main">
              <div className="hero-title">Hi, {displayName}!</div>
              <div className="hero-sub">“Review smart. Decide fast. Keep the queue moving.”</div>
            </div>
            <div className="hero-actions">
              {last ? <span className="muted">Updated {formatISTTime(last)}</span> : null}
              <button className="btn primary" onClick={refresh} disabled={loading}>
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          {error && <div className="form-message error">{error}</div>}

          <div className="summary-cards">
            <div className="summary-card">
              <span className="summary-label">Needs Assignment</span>
              <span className="summary-value">{needsAssignment.length}</span>
              <span className="summary-sub">Applications not yet assigned</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Pending Reviews</span>
              <span className="summary-value">{pendingReviews.length}</span>
              <span className="summary-sub">Verification done, waiting decision</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Sanction Letters</span>
              <span className="summary-value">{pendingSignatures.length}</span>
              <span className="summary-sub">Signed letters to verify</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Total Pending</span>
              <span className="summary-value">{pendingTotal}</span>
              <span className="summary-sub">Across all pending queues</span>
            </div>
          </div>

          <div className="analytics-grid">
            <div className="card analytics-card">
              <div className="analytics-head">
                <div>
                  <h3>Loans by Type</h3>
                  <p className="muted">Distribution across loan products (visible loans).</p>
                </div>
              </div>
              <BarChart data={barData} ariaLabel="Loans by type bar chart" valueFormatter={(v) => String(v)} />
            </div>

            <div className="card analytics-card">
              <div className="analytics-head">
                <div>
                  <h3>Recent Outcomes</h3>
                  <p className="muted">Breakdown from completed queue.</p>
                </div>
              </div>
              <div className="pie-stack">
                <PieChart data={pieData} ariaLabel="Recent outcomes pie chart" />
                <div className="pie-legend" aria-label="Outcome legend">
                  {pieData.map((d) => (
                    <div key={d.label} className="pie-legend-item">
                      <span className="legend-swatch" style={{ background: d.color }} aria-hidden="true" />
                      <span>{d.label}</span>
                      <strong style={{ marginLeft: "auto", color: "var(--text-primary)" }}>{d.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="analytics-grid">
            <div className="card analytics-card">
              <div className="analytics-head">
                <div>
                  <h3>Applications Trend</h3>
                  <p className="muted">Last 6 months (from applied dates).</p>
                </div>
              </div>
              <LineChart data={applicationsTrend} ariaLabel="Applications trend line chart" stroke="#2563eb" fill="rgba(37, 99, 235, 0.12)" />
            </div>

            <div className="card analytics-card">
              <div className="analytics-head">
                <div>
                  <h3>Completed Trend</h3>
                  <p className="muted">Last 6 months (from recent decisions).</p>
                </div>
              </div>
              <LineChart data={completedTrend} ariaLabel="Completed trend line chart" stroke="#22c55e" fill="rgba(34, 197, 94, 0.12)" />
            </div>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <div className="hstack" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <h3 style={{ margin: 0 }}>Open Queues</h3>
                <p className="muted" style={{ marginTop: 6 }}>
                  Use the sidebar, or jump directly using these shortcuts.
                </p>
              </div>
              <div className="hstack" style={{ gap: 10, flexWrap: "wrap" }}>
                <button type="button" className="btn" onClick={() => nav("/manager/pending")}>
                  Pending
                </button>
                <button type="button" className="btn" onClick={() => nav("/manager/completed")}>
                  Completed
                </button>
                <button type="button" className="btn primary" onClick={() => nav("/manager/sanctions")}>
                  Sanction Letters
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}




