import { useMemo, useState } from "react";
import BarChart from "../../../components/charts/BarChart";
import LineChart from "../../../components/charts/LineChart";
import PieChart from "../../../components/charts/PieChart";
import { formatISTDate } from "../../../lib/datetime";
import "../styles/customer-bank-details.css";

type LoanRecord = {
  loan_id: number;
  loan_amount: number;
  tenure_months: number;
  remaining_tenure?: number;
  remaining_amount?: number;
  emi_per_month?: number;
  total_paid?: number;
  next_emi_date?: string | number;
  emi_next_due_date?: string | number;
  emi_last_paid_at?: string | number | null;
  emi_last_paid_amount?: number | null;
  emi_overdue_count?: number;
  emi_overdue_amount?: number;
  status?: string;
  applied_at?: string | number;
  updated_at?: string | number;
  approved_at?: string | number;
  disbursed_at?: string | number;
  vehicle_type?: string;
  vehicle_model?: string;
};

type EmiDetails = {
  loan_id: number;
  next_due_date?: string | null;
  overdue_count?: number;
  overdue_amount?: number;
  upcoming?: Array<{
    installment_no: number;
    due_date?: string | null;
    principal_amount?: number;
    interest_amount?: number;
    penalty_amount?: number;
    total_due?: number;
    status?: string;
  }>;
  history?: Array<{
    installment_no: number;
    due_date?: string | null;
    paid_at?: string | null;
    paid_amount?: number;
    status?: string;
  }>;
};

type RecentActivityItem = {
  id: string;
  loan_id?: number;
  loan_type?: string;
  type?: string;
  amount?: number;
  balance_after?: number;
  created_at?: string;
};

interface CustomerBankDetailsProps {
  customerName?: string;
  accountNumber?: string;
  ifsc?: string;
  kycApproved?: boolean;
  kycState?: "pending" | "submitted" | "verified";
  balance?: number;
  activeLoanCount?: number;
  latestLoan?: LoanRecord;
  emiDetails?: EmiDetails | null;
  recentActivity?: RecentActivityItem[];
  onViewSettlement?: () => void;
  onForeclose?: () => void;
  onOpenDocuments?: () => void;
  onOpenSupport?: () => void;
  onKycClick?: () => void;
  onOpenWallet?: () => void;
  onOpenLoans?: () => void;
  onOpenTrack?: () => void;
  onOpenEmi?: () => void;
}

export default function CustomerBankDetails({
  customerName = "Rajesh Kumar",
  accountNumber = "",
  ifsc = "",
  kycApproved = false,
  kycState = "pending",
  balance = 0,
  activeLoanCount = 0,
  latestLoan,
  emiDetails = null,
  recentActivity = [],
  onViewSettlement,
  onForeclose,
  onOpenDocuments,
  onOpenSupport,
  onKycClick,
  onOpenWallet,
  onOpenLoans,
  onOpenTrack,
  onOpenEmi,
}: CustomerBankDetailsProps) {
  const [openHelp, setOpenHelp] = useState<"faq" | "contact" | "links">("faq");
  const kycAvailable = kycState === "pending";

  const formatINR = (value: number | null | undefined, fallback = "-") => {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return `\u20B9${Math.round(n).toLocaleString("en-IN")}`;
  };

  const formatDate = (value: string | number | null | undefined, fallback = "-") => {
    return formatISTDate(value as any, { year: "numeric", month: "short", day: "2-digit" }, fallback);
  };

  const loanStatusLabel = (value?: string) => {
    const s = String(value || "").toLowerCase().trim();
    if (!s) return "\u2014";
    if (s === "assigned_to_verification") return "Under Verification";
    if (s === "verification_done") return "Verified";
    if (s === "manager_approved") return "Manager Approved";
    if (s === "pending_admin_approval") return "Admin Review";
    if (s === "admin_approved") return "Approved";
    if (s === "sanction_sent") return "Sanction Sent";
    if (s === "signed_received") return "Signed Received";
    if (s === "ready_for_disbursement") return "Ready for Disbursement";
    if (s === "disbursed") return "Disbursed";
    if (s === "active") return "Active";
    if (s === "completed") return "Completed";
    if (s === "rejected") return "Rejected";
    return s.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
  };

  const nextEmi = emiDetails?.upcoming?.[0];
  const upcoming = Array.isArray(emiDetails?.upcoming) ? emiDetails!.upcoming! : [];
  const nextDueDate =
    nextEmi?.due_date ??
    emiDetails?.next_due_date ??
    latestLoan?.emi_next_due_date ??
    latestLoan?.next_emi_date ??
    null;
  const nextDueAmount = nextEmi?.total_due ?? latestLoan?.emi_per_month ?? null;
  const overdueCount = Number(emiDetails?.overdue_count ?? latestLoan?.emi_overdue_count ?? 0);
  const overdueAmount = Number(emiDetails?.overdue_amount ?? latestLoan?.emi_overdue_amount ?? 0);

  const progress = useMemo(() => {
    const loanAmount = Number(latestLoan?.loan_amount ?? 0);
    const remaining = Number(latestLoan?.remaining_amount ?? 0);
    const totalPaidExplicit = Number(latestLoan?.total_paid ?? NaN);

    const paidFromHistory = Array.isArray(emiDetails?.history)
      ? emiDetails!.history!.reduce((acc, row) => {
          const amt = Number((row as any)?.paid_amount ?? 0);
          return Number.isFinite(amt) && amt > 0 ? acc + amt : acc;
        }, 0)
      : 0;

    const inferredPaid =
      Number.isFinite(loanAmount) && Number.isFinite(remaining) && loanAmount > 0 ? Math.max(0, loanAmount - remaining) : 0;

    const paid = Number.isFinite(totalPaidExplicit)
      ? Math.max(0, totalPaidExplicit)
      : paidFromHistory > 0
        ? paidFromHistory
        : inferredPaid;

    const scheduleRemaining = Array.isArray(emiDetails?.upcoming)
      ? emiDetails!.upcoming!.reduce((acc, u) => {
          const status = String((u as any)?.status || "").toLowerCase().trim();
          if (status === "paid" || status === "completed") return acc;
          const totalDue = Number((u as any)?.total_due ?? 0);
          if (Number.isFinite(totalDue) && totalDue > 0) return acc + totalDue;
          const principal = Number((u as any)?.principal_amount ?? 0);
          const interest = Number((u as any)?.interest_amount ?? 0);
          const penalty = Number((u as any)?.penalty_amount ?? 0);
          const sum = principal + interest + penalty;
          return Number.isFinite(sum) && sum > 0 ? acc + sum : acc;
        }, 0)
      : 0;

    const fallbackRemaining = Number.isFinite(loanAmount) && loanAmount > 0 ? Math.max(0, loanAmount - Math.min(loanAmount, paid)) : 0;
    const remainingField = Number.isFinite(remaining) ? Math.max(0, remaining) : 0;

    // Guardrail: backend "remaining_amount" has been seen to return incorrect inflated values for new loans.
    // Prefer EMI schedule if available; otherwise fall back to principal-based remaining for suspicious values.
    const suspiciousRemaining = loanAmount > 0 && remainingField > loanAmount * 1.4 && paid <= 0;
    const safeRemaining = scheduleRemaining > 0 ? scheduleRemaining : suspiciousRemaining ? fallbackRemaining : remainingField || fallbackRemaining;

    const total = paid + safeRemaining;
    const paidPct = total > 0 ? Math.min(100, Math.max(0, Math.round((paid / total) * 100))) : 0;
    const remainingPct = total > 0 ? Math.max(0, 100 - paidPct) : 0;
    return { remaining: safeRemaining, paid, paidPct, remainingPct };
  }, [emiDetails?.history, emiDetails?.upcoming, latestLoan?.loan_amount, latestLoan?.remaining_amount, latestLoan?.total_paid]);

  const progressPie = useMemo(() => {
    if (!latestLoan) return [];
    if (progress.paidPct <= 0 && progress.remainingPct <= 0) return [];
    return [
      { label: "Paid", value: progress.paidPct, color: "#22c55e" },
      { label: "Remaining", value: progress.remainingPct, color: "#3b82f6" },
    ];
  }, [latestLoan, progress.paidPct, progress.remainingPct]);

  const upcomingBars = useMemo(() => {
    const rows = emiDetails?.upcoming || [];
    return rows.slice(0, 6).map((u) => {
      const d = u.due_date ? new Date(u.due_date) : null;
      const label =
        d && !Number.isNaN(d.getTime())
          ? formatISTDate(d, { month: "short", day: "2-digit" })
          : `#${u.installment_no}`;
      const value = Number(u.total_due ?? 0);
      return { label, value: Number.isFinite(value) ? Math.max(0, value) : 0, color: "#2563eb" };
    });
  }, [emiDetails?.upcoming]);

  const paymentTrend = useMemo(() => {
    const rows = emiDetails?.history || [];
    const now = new Date();
    const buckets = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = formatISTDate(d, { month: "short" });
      return { key, label };
    });
    const sums = new Map<string, number>();
    buckets.forEach((b) => sums.set(b.key, 0));
    rows.forEach((r) => {
      if (!r.paid_at) return;
      const d = new Date(r.paid_at);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!sums.has(key)) return;
      const amt = Number(r.paid_amount ?? 0);
      if (!Number.isFinite(amt) || amt <= 0) return;
      sums.set(key, (sums.get(key) || 0) + amt);
    });
    return buckets.map((b) => ({ label: b.label, value: Math.round((sums.get(b.key) || 0) / 1000) }));
  }, [emiDetails?.history]);

  const latestActivity = useMemo(() => {
    const items = Array.isArray(recentActivity) ? recentActivity : [];
    return items
      .slice()
      .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
      .slice(0, 5);
  }, [recentActivity]);

  const handleKycAction = () => {
    if (onKycClick) onKycClick();
  };
  const hasVirtualBank = Boolean(String(accountNumber || "").trim() || String(ifsc || "").trim());
  const latestLoanStatus = String(latestLoan?.status || "").toLowerCase().trim();
  const hasActionableLoan = Boolean(
    latestLoan?.loan_id &&
      activeLoanCount > 0 &&
      !["completed", "rejected", "foreclosed", "closed"].includes(latestLoanStatus),
  );
  const repaymentHealthLabel = overdueCount > 0 ? "Attention Needed" : "On Track";
  const repaymentHealthHint =
    overdueCount > 0 ? `${overdueCount} overdue installment(s)` : "No overdue EMIs";
  const serviceAccessLabel = kycApproved ? "Unlocked" : "Limited";
  const serviceAccessHint =
    kycState === "submitted" ? "KYC under review" : kycState === "pending" ? "Complete KYC to unlock all" : "All customer flows available";
  const nextActionLabel = hasActionableLoan ? "Pay / Track Loan" : "Apply for Loan";
  const nextActionHint = hasActionableLoan ? "EMI and tracking actions available" : "No active actionable loan right now";

  return (
    <section className="bankdash-root" aria-label="Customer dashboard overview">
      <article className="bankdash-card bankdash-welcome-card" aria-label="Welcome">
        <div className="bankdash-header">
          <h2>Welcome, {customerName}</h2>
          <p>Track loans, pay EMIs, and manage your wallet from one place.</p>
        </div>
      </article>

      <div className="bankdash-identity-row">
        <article className="bankdash-card bankdash-virtual-bank-card" aria-label="Virtual bank details">
          <div className="bankdash-analytics-head">
            <div>
              <h3>Virtual Bank Details</h3>
              <p className="muted">Use these details to identify your PayCrest virtual account.</p>
            </div>
          </div>
          {hasVirtualBank ? (
            <div className="bankdash-kv-list">
              <div>
                <span>Account Number</span>
                <strong>{accountNumber || "—"}</strong>
              </div>
              <div>
                <span>IFSC</span>
                <strong>{ifsc || "—"}</strong>
              </div>
              <div>
                <span>Bank</span>
                <strong>PayCrest Virtual Banking</strong>
              </div>
            </div>
          ) : (
            <div className="bankdash-empty">
              <strong>Virtual bank details not available.</strong>
              <span>Please refresh or contact support if this continues.</span>
            </div>
          )}
        </article>

        <aside className="bankdash-customer-cards" aria-label="Customer quick details">
          <article className="bankdash-customer-mini">
            <span className="label">Repayment Health</span>
            <strong className="value">{repaymentHealthLabel}</strong>
            <span className="hint">{repaymentHealthHint}</span>
          </article>
          <article className="bankdash-customer-mini">
            <span className="label">Service Access</span>
            <strong className="value">{serviceAccessLabel}</strong>
            <span className="hint">{serviceAccessHint}</span>
          </article>
          <article className="bankdash-customer-mini">
            <span className="label">Next Action</span>
            <strong className="value">{nextActionLabel}</strong>
            <span className="hint">{nextActionHint}</span>
          </article>
        </aside>
      </div>

      <div className="bankdash-summary" aria-label="Account overview">
        <div className="bankdash-summary-card">
          <span className="bankdash-summary-label">Wallet Balance</span>
          <strong className="bankdash-summary-value">{formatINR(balance, "\u20B90")}</strong>
          <span className="bankdash-summary-sub">Available to pay EMIs & fees</span>
        </div>
        <div className="bankdash-summary-card">
          <span className="bankdash-summary-label">KYC Status</span>
          <strong className="bankdash-summary-value">
            {kycState === "verified" ? "Approved" : kycState === "submitted" ? "Submitted" : "Pending"}
          </strong>
          <span className="bankdash-summary-sub">{kycApproved ? "All services unlocked" : "Complete KYC to unlock"}</span>
        </div>
        <div className="bankdash-summary-card">
          <span className="bankdash-summary-label">Next EMI</span>
          <strong className="bankdash-summary-value">{formatINR(nextDueAmount, "\u2014")}</strong>
          <span className="bankdash-summary-sub">{nextDueDate ? `Due ${formatDate(nextDueDate)}` : "No due date available"}</span>
        </div>
        <div className={`bankdash-summary-card ${overdueAmount > 0 ? "bankdash-summary-card--alert" : ""}`}>
          <span className="bankdash-summary-label">Overdue</span>
          <strong className="bankdash-summary-value">{overdueAmount > 0 ? formatINR(overdueAmount) : "\u20B90"}</strong>
          <span className="bankdash-summary-sub">{overdueCount > 0 ? `${overdueCount} installment(s) pending` : `Active loans: ${activeLoanCount}`}</span>
        </div>
      </div>

      <div className="bankdash-grid">
        <article className="bankdash-card">
          <h3>Loan Snapshot</h3>
          <div className="bankdash-kv-list">
            <div>
              <span>Latest Loan Status</span>
              <strong>{latestLoan ? loanStatusLabel(latestLoan.status) : "No loan yet"}</strong>
            </div>
            <div>
              <span>Loan Amount</span>
              <strong>{latestLoan ? formatINR(latestLoan.loan_amount) : "\u2014"}</strong>
            </div>
            <div>
              <span>Outstanding</span>
              <strong>{latestLoan ? formatINR(progress.remaining) : "\u2014"}</strong>
            </div>
            <div>
              <span>Paid to Date</span>
              <strong>{latestLoan ? formatINR(progress.paid) : "\u2014"}</strong>
            </div>
          </div>
          <div className="bankdash-actions-row">
            <button type="button" className="bankdash-btn-primary" onClick={onOpenTrack} disabled={!onOpenTrack || !latestLoan}>
              Track Status
            </button>
            <button type="button" className="bankdash-btn-outline" onClick={onOpenEmi} disabled={!onOpenEmi || !latestLoan}>
              Pay Next EMI
            </button>
          </div>
        </article>

        <article className="bankdash-card bankdash-card-muted">
          <h3>Recent Activity</h3>
          {latestActivity.length ? (
            <ul className="bankdash-activity-list" aria-label="Recent transactions">
              {latestActivity.map((t) => {
                const amt = Number(t.amount ?? 0);
                const isCredit = amt > 0 || String(t.type || "").toLowerCase() === "credit";
                const title = String(t.type || (isCredit ? "credit" : "debit")).replace(/_/g, " ");
                const when = t.created_at ? formatDate(t.created_at, "") : "";
                const loanTag = t.loan_id ? `Loan #${t.loan_id}` : "";
                return (
                  <li key={t.id}>
                    <div className="bankdash-activity-item">
                      <span className="bankdash-activity-title">{title}</span>
                      <span className="bankdash-activity-meta">
                        {when ? <span>{when}</span> : null}
                        {loanTag ? <span>{loanTag}</span> : null}
                      </span>
                      <strong className={isCredit ? "bankdash-amount bankdash-amount--credit" : "bankdash-amount bankdash-amount--debit"}>
                        {formatINR(Math.abs(amt), "\u2014")}
                      </strong>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              No transactions yet.
            </p>
          )}
          <div className="bankdash-actions-row">
            <button type="button" className="bankdash-btn-primary" onClick={onOpenWallet} disabled={!onOpenWallet}>
              Open Wallet
            </button>
            <button type="button" className="bankdash-btn-outline" onClick={onOpenLoans} disabled={!onOpenLoans}>
              Explore Loans
            </button>
          </div>
        </article>
      </div>

      <div className="bankdash-analytics" aria-label="Insights">
        <article className="bankdash-card bankdash-analytics-card">
          <div className="bankdash-analytics-head">
            <div>
              <h3>Repayment Progress</h3>
              <p className="muted">Paid vs remaining for your latest loan.</p>
            </div>
          </div>
          <div className="bankdash-pie-stack">
            <PieChart data={progressPie} ariaLabel="Repayment progress pie chart" />
            <div className="bankdash-pie-legend" aria-label="Progress legend">
              <div className="bankdash-pie-legend-item">
                <span className="bankdash-legend-swatch" style={{ background: "#22c55e" }} aria-hidden="true" />
                <span>Paid</span>
                <strong style={{ marginLeft: "auto" }}>{latestLoan ? formatINR(progress.paid, "\u2014") : "\u2014"}</strong>
              </div>
              <div className="bankdash-pie-legend-item">
                <span className="bankdash-legend-swatch" style={{ background: "#3b82f6" }} aria-hidden="true" />
                <span>Remaining</span>
                <strong style={{ marginLeft: "auto" }}>{latestLoan ? formatINR(progress.remaining, "\u2014") : "\u2014"}</strong>
              </div>
            </div>
          </div>
        </article>

        <article className="bankdash-card bankdash-analytics-card">
          <div className="bankdash-analytics-head">
            <div>
              <h3>Upcoming EMIs</h3>
              <p className="muted">Next 6 installments (amount due).</p>
            </div>
          </div>
          <BarChart
            data={upcomingBars}
            ariaLabel="Upcoming EMI bar chart"
            valueFormatter={(v) => `\u20B9${new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(v)}`}
          />
        </article>
      </div>

      <article className="bankdash-card bankdash-analytics-card" aria-label="Payment trend">
        <div className="bankdash-analytics-head">
          <div>
            <h3>Payments Trend</h3>
            <p className="muted">Last 6 months (\u20B9 in thousands).</p>
          </div>
        </div>
        <LineChart data={paymentTrend} ariaLabel="Payments trend line chart" stroke="#1f5fbf" fill="rgba(31, 95, 191, 0.12)" />
      </article>

      <article className="bankdash-card" aria-label="Loan schedule" style={{ padding: 18 }}>
        <div className="bankdash-analytics-head">
          <div>
            <h3>Loan Schedule</h3>
            <p className="muted">Upcoming installments with status.</p>
          </div>
          <div className="bankdash-actions-row" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="bankdash-btn-outline" onClick={onOpenDocuments} disabled={!onOpenDocuments}>
              Documents
            </button>
          </div>
        </div>

        {!latestLoan?.loan_id ? (
          <div className="bankdash-empty">
            <strong>No loan schedule yet.</strong>
            <span>Apply for a loan to see EMI schedule here.</span>
          </div>
        ) : !upcoming.length ? (
          <div className="bankdash-empty">
            <strong>No upcoming EMIs found.</strong>
            <span>Check EMI tab for full history.</span>
          </div>
        ) : (
          <div className="bankdash-table-wrap" role="region" aria-label="Upcoming EMIs table">
            <table className="bankdash-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {upcoming.slice(0, 6).map((u, idx) => {
                  const status = String(u.status || "pending").toLowerCase();
                  const pill =
                    status === "paid" || status === "completed"
                      ? "success"
                      : status.includes("overdue")
                      ? "danger"
                      : "info";
                  const canPay = idx === 0 && !!onOpenEmi;
                  return (
                    <tr key={u.installment_no}>
                      <td>{u.installment_no}</td>
                      <td>{u.due_date ? formatDate(u.due_date) : "\u2014"}</td>
                      <td>
                        <span className={`bankdash-pill ${pill}`}>
                          {status ? status.replace(/_/g, " ") : "pending"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>{formatINR(u.total_due, "\u2014")}</td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="bankdash-btn-outline"
                          onClick={canPay ? onOpenEmi : undefined}
                          disabled={!canPay}
                          title={canPay ? "Pay next EMI" : "Only next EMI can be paid here"}
                          style={{ padding: "8px 10px" }}
                        >
                          Pay
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <div className="bankdash-grid bankdash-grid-lower">
        <article className="bankdash-card">
          <h3>Quick Actions</h3>
          <div className="bankdash-quick-actions">
            <button type="button" className="bankdash-btn-outline" onClick={onOpenLoans} disabled={!onOpenLoans}>
              Explore Loans
            </button>
            <button type="button" className="bankdash-btn-outline" onClick={onOpenTrack} disabled={!onOpenTrack}>
              Track Application
            </button>
            <button
              type="button"
              className={`bankdash-btn-outline ${!kycAvailable ? "bankdash-btn-disabled" : ""}`}
              onClick={kycAvailable ? handleKycAction : undefined}
              disabled={!kycAvailable}
              aria-disabled={!kycAvailable}
            >
              {kycState === "verified" ? "KYC Completed" : "Complete KYC"}
            </button>
          </div>
          <p className="muted" style={{ margin: 0 }}>
            {"Keep the dashboard focused\u2014Wallet and transactions live in the Wallet tab."}
          </p>
        </article>

        <article className="bankdash-card bankdash-help-card">
          <h3>Need Help?</h3>

          <div className="help-accordion">
            <button type="button" className={`help-item ${openHelp === "faq" ? "open" : ""}`} onClick={() => setOpenHelp("faq")}>
              FAQs
            </button>
            {openHelp === "faq" && (
              <div className="help-panel">
                <p>How can I increase my limit?</p>
                <p>When is EMI auto-debited?</p>
                <p>How to download statements?</p>
              </div>
            )}

            <button
              type="button"
              className={`help-item ${openHelp === "contact" ? "open" : ""}`}
              onClick={() => setOpenHelp("contact")}
            >
              Contact Options
            </button>
            {openHelp === "contact" && (
              <div className="help-panel">
                <p>Email: support@paycrest.com</p>
                <p>Phone: 1800-123-456</p>
                <p>Hours: Mon-Sat, 9:00 AM to 7:00 PM</p>
              </div>
            )}

            <button type="button" className={`help-item ${openHelp === "links" ? "open" : ""}`} onClick={() => setOpenHelp("links")}>
              Useful Links
            </button>
            {openHelp === "links" && (
              <div className="help-panel">
                <p>Loan Eligibility Guide</p>
                <p>Repayment Policy</p>
                <p>Charges and Fees</p>
              </div>
            )}
          </div>

          <button type="button" className="bankdash-btn-outline" onClick={onOpenSupport} disabled={!onOpenSupport}>
            Raise a Support Ticket
          </button>
        </article>
      </div>

      {hasActionableLoan ? (
        <article className="bankdash-card" aria-label="Settlement and foreclosure">
          <div className="bankdash-analytics-head">
            <div>
              <h3>Settlement & Foreclosure</h3>
              <p className="muted">View charges and close your loan early (if eligible).</p>
            </div>
          </div>
          <div className="bankdash-actions-row">
            <button type="button" className="bankdash-btn-outline" onClick={onViewSettlement} disabled={!onViewSettlement}>
              View Settlement
            </button>
            <button
              type="button"
              className="bankdash-btn-outline bankdash-btn-outline--danger"
              onClick={onForeclose}
              disabled={!onForeclose}
              title="Foreclosure may include fees"
            >
              Foreclose Loan
            </button>
          </div>
        </article>
      ) : null}
    </section>
  );
}

