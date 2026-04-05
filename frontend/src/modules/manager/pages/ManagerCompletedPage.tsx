import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../../styles/verification.css";
import { formatISTDate, formatISTDateTime, formatISTTime } from "../../../lib/datetime";
import { getSession, managerLoans } from '../../../modules/manager/services/managerApi';
import { getLoanStatusClass, getLoanStatusLabel } from "../../../lib/workflow";
import { getLoanCollection, getRowTs, loanTypeLabel, partitionManagerLoans, type LoanRow } from "./managerQueue";
import BarChart from "../../../components/charts/BarChart";
import PieChart from "../../../components/charts/PieChart";
import DataState from "../../../components/ui/DataState";

export default function ManagerCompletedPage() {
  const nav = useNavigate();
  const [recent, setRecent] = useState<LoanRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any | null>(null);
  const [last, setLast] = useState<number | null>(null);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const loans = await managerLoans();
      const { recent: r } = partitionManagerLoans(loans || []);
      setRecent(r);
      setLast(Date.now());
      setPage(1);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load completed queue"));
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
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible" || loading) return;
      void refresh();
    }, 15000);
    return () => window.clearInterval(timer);
  }, [loading]);

  const logoUrl = new URL("../../../styles/paycrest-logo.png", import.meta.url).href;
  const totalPages = Math.max(1, Math.ceil(recent.length / pageSize));
  const pageRows = recent.slice((page - 1) * pageSize, page * pageSize);

  const outcomeCounts = recent.reduce(
    (acc, loan) => {
      const s = String(loan.status || "").toLowerCase();
      if (["rejected", "foreclosed"].includes(s)) acc.rejected += 1;
      else if (
        ["manager_approved", "pending_admin_approval", "admin_approved", "sanction_sent", "ready_for_disbursement", "disbursed", "active", "completed"].includes(s)
      ) {
        acc.approved += 1;
      } else {
        acc.other += 1;
      }
      return acc;
    },
    { approved: 0, rejected: 0, other: 0 },
  );

  const pieData = [
    { label: "Approved/Forwarded", value: outcomeCounts.approved, color: "#22c55e" },
    { label: "Rejected", value: outcomeCounts.rejected, color: "#ef4444" },
    { label: "Other", value: outcomeCounts.other, color: "#60a5fa" },
  ];

  const typeCounts = recent.reduce(
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

  const barData = [
    { label: "Personal", value: typeCounts.personal, color: "#3b82f6" },
    { label: "Vehicle", value: typeCounts.vehicle, color: "#f59e0b" },
    { label: "Home", value: typeCounts.home, color: "#06b6d4" },
    { label: "Education", value: typeCounts.education, color: "#8b5cf6" },
  ];

  const latestCards = recent.slice(0, 4);

  return (
    <div className="verification-page manager-page">
      <div className="verification-container">
        <div className="vstack">
          <div className="verification-hero">
            <div className="hero-main">
              <div className="hero-title">Completed</div>
              <div className="hero-sub">Applications already moved forward or rejected.</div>
            </div>
            <div className="hero-actions">
              {last ? <span className="muted">Updated {formatISTTime(last)}</span> : null}
              <button className="btn primary" onClick={refresh} disabled={loading}>
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          {error ? (
            <DataState
              variant="error"
              title="Unable to load completed queue"
              message={String(error)}
              ctaLabel="Retry"
              onCta={() => {
                void refresh();
              }}
            />
          ) : null}

          <div className="summary-cards summary-cards--wide">
            <div className="summary-card">
              <span className="summary-label">Total Completed</span>
              <span className="summary-value">{recent.length}</span>
              <span className="summary-sub">All decisions so far</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Approved/Forwarded</span>
              <span className="summary-value">{outcomeCounts.approved}</span>
              <span className="summary-sub">Moved forward</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Rejected</span>
              <span className="summary-value">{outcomeCounts.rejected}</span>
              <span className="summary-sub">Not approved</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Other</span>
              <span className="summary-value">{outcomeCounts.other}</span>
              <span className="summary-sub">Unclassified states</span>
            </div>
          </div>

          <div className="analytics-grid">
            <div className="card analytics-card">
              <div className="analytics-head">
                <div>
                  <h3>Completed by Type</h3>
                  <p className="muted">Loan products in the completed queue.</p>
                </div>
              </div>
              <BarChart data={barData} ariaLabel="Completed loans by type bar chart" valueFormatter={(v) => String(v)} />
            </div>

            <div className="card analytics-card">
              <div className="analytics-head">
                <div>
                  <h3>Outcome Split</h3>
                  <p className="muted">Approved vs rejected vs other.</p>
                </div>
              </div>
              <div className="pie-stack">
                <PieChart data={pieData} ariaLabel="Completed outcomes pie chart" />
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

          <div className="card" style={{ padding: 16 }}>
            <div className="card-head" style={{ padding: 0, marginBottom: 12 }}>
              <div>
                <h3>Latest Completed</h3>
                <p className="muted">Quick glance at the most recent decisions.</p>
              </div>
            </div>
            <div className="mini-cards">
              {latestCards.length ? (
                latestCards.map((l) => {
                  const collection = getLoanCollection(l);
                  return (
                    <div key={`${collection}:${l.loan_id}:card`} className="mini-card">
                      <div className="mini-card__top">
                        <div className="mini-card__title">Loan #{l.loan_id}</div>
                        <span className={`status-pill ${getLoanStatusClass(l.status)}`}>{getLoanStatusLabel(l.status)}</span>
                      </div>
                      <div className="mini-card__meta">
                        <span className="type-pill">{loanTypeLabel(collection)}</span>
                        <span className="muted">INR {l.loan_amount ?? "-"}</span>
                      </div>
                      <div className="muted">{getRowTs(l) ? formatISTDateTime(getRowTs(l)) : "-"}</div>
                    </div>
                  );
                })
              ) : (
                <DataState variant="empty" title="No completed items yet" message="Once reviews are finalized, outcomes will appear here." />
              )}
            </div>
          </div>

          <div className="card card-table">
            <div className="card-head">
              <div>
                <h3>Recent Decisions</h3>
                <p className="muted">Latest manager activity.</p>
              </div>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Loan ID</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Last Update</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length ? (
                  pageRows.map((l) => {
                    const collection = getLoanCollection(l);
                    return (
                      <tr key={`${collection}:${l.loan_id}:recent`}>
                        <td>{l.loan_id}</td>
                        <td>{l.customer_id ?? "-"}</td>
                        <td>
                          <span className="type-pill">{loanTypeLabel(collection)}</span>
                        </td>
                        <td>INR {l.loan_amount ?? "-"}</td>
                        <td>
                          <span className={`status-pill ${getLoanStatusClass(l.status)}`}>{getLoanStatusLabel(l.status)}</span>
                        </td>
                        <td>{getRowTs(l) ? formatISTDate(getRowTs(l), { year: "numeric", month: "2-digit", day: "2-digit" }) : "-"}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6}>
                      <DataState variant="empty" title="No recent manager activity" message="Completed decisions will populate this table." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button className="btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                  Prev
                </button>
                <div className="muted">
                  Page {page} of {totalPages}
                </div>
                <button className="btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                  Next
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <label className="muted">Rows:</label>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}




