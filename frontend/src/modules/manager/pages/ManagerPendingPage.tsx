import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../../styles/verification.css";
import { formatISTDate, formatISTTime } from "../../../lib/datetime";
import { getSession, managerLoans } from '../../../modules/manager/services/managerApi';
import { getLoanStatusClass, getLoanStatusLabel } from "../../../lib/workflow";
import { getLoanCollection, loanTypeLabel, partitionManagerLoans, type LoanRow } from "./managerQueue";
import BarChart from "../../../components/charts/BarChart";
import DataState from "../../../components/ui/DataState";

export default function ManagerPendingPage() {
  const nav = useNavigate();
  const [needsAssignment, setNeedsAssignment] = useState<LoanRow[]>([]);
  const [pendingReviews, setPendingReviews] = useState<LoanRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any | null>(null);
  const [last, setLast] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "personal_loans" | "vehicle_loans" | "home_loans" | "education_loans">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "applied" | "verification_done">("all");

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const loans = await managerLoans();
      const { needsAssignment: a, pendingReviews: p } = partitionManagerLoans(loans || []);
      setNeedsAssignment(a);
      setPendingReviews(p);
      setLast(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load pending queues"));
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
  const typeCounts = [...needsAssignment, ...pendingReviews].reduce(
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

  const filterRows = (rows: LoanRow[]) => {
    const q = search.trim().toLowerCase();
    return rows.filter((l) => {
      const collection = getLoanCollection(l);
      if (typeFilter !== "all" && collection !== typeFilter) return false;
      const status = String(l.status || "").toLowerCase();
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (!q) return true;
      const hay = `${l.loan_id} ${l.customer_id ?? ""} ${collection} ${status}`.toLowerCase();
      return hay.includes(q);
    });
  };

  const filteredNeedsAssignment = filterRows(needsAssignment);
  const filteredPendingReviews = filterRows(pendingReviews);

  return (
    <div className="verification-page manager-page">
      <div className="verification-container">
        <div className="vstack">
          <div className="verification-hero">
            <div className="hero-main">
              <div className="hero-title">Pending</div>
              <div className="hero-sub">Assign verification and review credit-ready applications.</div>
            </div>
            <div className="hero-actions">
              {last ? <span className="muted">Updated {formatISTTime(last)}</span> : null}
              <button className="btn primary" onClick={refresh} disabled={loading}>
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          <div className="card verification-filters">
            <div className="verification-filters__row">
              <label className="form-field">
                <span>Search</span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Loan ID, customer, status"
                  aria-label="Search pending loans"
                />
              </label>
              <label className="form-field">
                <span>Loan Type</span>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)}>
                  <option value="all">All</option>
                  <option value="personal_loans">Personal</option>
                  <option value="vehicle_loans">Vehicle</option>
                  <option value="home_loans">Home</option>
                  <option value="education_loans">Education</option>
                </select>
              </label>
              <label className="form-field">
                <span>Queue</span>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
                  <option value="all">All</option>
                  <option value="applied">Needs Assignment</option>
                  <option value="verification_done">Pending Reviews</option>
                </select>
              </label>
            </div>
          </div>

          {error ? (
            <DataState
              variant="error"
              title="We couldn't load manager queues"
              message={error instanceof Error ? error.message : String(error)}
              ctaLabel="Retry"
              onCta={() => {
                void refresh();
              }}
            />
          ) : null}

          {loading ? (
            <div className="verification-skeleton-grid" aria-hidden="true">
              <div className="ds-skeleton verification-skeleton-card"></div>
              <div className="ds-skeleton verification-skeleton-card"></div>
            </div>
          ) : null}

          {!loading && (
            <div className="analytics-grid">
              <div className="card analytics-card">
                <div className="analytics-head">
                  <div>
                    <h3>Pending by Type</h3>
                    <p className="muted">Loan products currently in pending queues.</p>
                  </div>
                </div>
                <BarChart data={barData} ariaLabel="Pending loans by type bar chart" valueFormatter={(v) => String(v)} />
              </div>
              <div className="card analytics-card">
                <div className="analytics-head">
                  <div>
                    <h3>Pending Totals</h3>
                    <p className="muted">Assignment vs reviews.</p>
                  </div>
                </div>
                <div className="summary-cards compact">
                  <div className="summary-card">
                    <span className="summary-label">Needs Assignment</span>
                    <span className="summary-value">{filteredNeedsAssignment.length}</span>
                    <span className="summary-sub">Not assigned yet</span>
                  </div>
                  <div className="summary-card">
                    <span className="summary-label">Pending Reviews</span>
                    <span className="summary-value">{filteredPendingReviews.length}</span>
                    <span className="summary-sub">Ready for decision</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!loading && (
            <div className="card card-table">
            <div className="card-head">
              <div>
                <h3>Loans Awaiting Verification Assignment</h3>
                <p className="muted">Assign verification staff to start document checks.</p>
              </div>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Loan ID</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Tenure</th>
                  <th>Status</th>
                  <th>Applied</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredNeedsAssignment.length ? (
                  filteredNeedsAssignment.map((l) => {
                    const collection = getLoanCollection(l);
                    return (
                      <tr key={`${collection}:${l.loan_id}:assign`}>
                        <td>{l.loan_id}</td>
                        <td>{l.customer_id ?? "-"}</td>
                        <td>
                          <span className="type-pill">{loanTypeLabel(collection)}</span>
                        </td>
                        <td>INR {l.loan_amount ?? "-"}</td>
                        <td>{l.tenure_months ?? "-"} M</td>
                        <td>
                          <span className={`status-pill ${getLoanStatusClass(l.status)}`}>{getLoanStatusLabel(l.status)}</span>
                        </td>
                        <td>{l.applied_at ? formatISTDate(l.applied_at, { year: "numeric", month: "2-digit", day: "2-digit" }) : "-"}</td>
                        <td>
                          <button className="btn compact" onClick={() => nav(`/manager/review/${collection}:${l.loan_id}`)}>
                            Assign
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8}>
                      <DataState
                        variant="empty"
                        title="No assignments pending"
                        message="New applications waiting for verification assignment will appear here."
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="verification-mobile-list" aria-label="Needs assignment cards">
              {filteredNeedsAssignment.map((l) => {
                const collection = getLoanCollection(l);
                return (
                  <article key={`${collection}:${l.loan_id}:assign:mobile`} className="verification-mobile-card">
                    <div className="verification-mobile-card__head">
                      <strong>Loan #{l.loan_id}</strong>
                      <span className={`status-pill ${getLoanStatusClass(l.status)}`}>{getLoanStatusLabel(l.status)}</span>
                    </div>
                    <p className="muted">Customer: {l.customer_id ?? "-"}</p>
                    <p className="muted">Type: {loanTypeLabel(collection)}</p>
                    <p className="muted">Amount: INR {l.loan_amount ?? "-"}</p>
                    <button className="btn compact primary" onClick={() => nav(`/manager/review/${collection}:${l.loan_id}`)}>
                      Assign
                    </button>
                  </article>
                );
              })}
            </div>
            </div>
          )}

          {!loading && (
            <div className="card card-table">
            <div className="card-head">
              <div>
                <h3>Pending Manager Reviews</h3>
                <p className="muted">Applications cleared by verification team.</p>
              </div>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Loan ID</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Tenure</th>
                  <th>Status</th>
                  <th>Applied</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPendingReviews.length ? (
                  filteredPendingReviews.map((l) => {
                    const collection = getLoanCollection(l);
                    return (
                      <tr key={`${collection}:${l.loan_id}:review`}>
                        <td>{l.loan_id}</td>
                        <td>{l.customer_id ?? "-"}</td>
                        <td>
                          <span className="type-pill">{loanTypeLabel(collection)}</span>
                        </td>
                        <td>INR {l.loan_amount ?? "-"}</td>
                        <td>{l.tenure_months ?? "-"} M</td>
                        <td>
                          <span className={`status-pill ${getLoanStatusClass(l.status)}`}>{getLoanStatusLabel(l.status)}</span>
                        </td>
                        <td>{l.applied_at ? formatISTDate(l.applied_at, { year: "numeric", month: "2-digit", day: "2-digit" }) : "-"}</td>
                        <td>
                          <button className="btn compact" onClick={() => nav(`/manager/review/${collection}:${l.loan_id}`)}>
                            Review
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8}>
                      <DataState
                        variant="empty"
                        title="No manager reviews pending"
                        message="Verification-complete applications will appear in this queue."
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="verification-mobile-list" aria-label="Pending reviews cards">
              {filteredPendingReviews.map((l) => {
                const collection = getLoanCollection(l);
                return (
                  <article key={`${collection}:${l.loan_id}:review:mobile`} className="verification-mobile-card">
                    <div className="verification-mobile-card__head">
                      <strong>Loan #{l.loan_id}</strong>
                      <span className={`status-pill ${getLoanStatusClass(l.status)}`}>{getLoanStatusLabel(l.status)}</span>
                    </div>
                    <p className="muted">Customer: {l.customer_id ?? "-"}</p>
                    <p className="muted">Type: {loanTypeLabel(collection)}</p>
                    <p className="muted">Amount: INR {l.loan_amount ?? "-"}</p>
                    <button className="btn compact primary" onClick={() => nav(`/manager/review/${collection}:${l.loan_id}`)}>
                      Review
                    </button>
                  </article>
                );
              })}
            </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}




