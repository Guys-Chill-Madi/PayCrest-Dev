import { useMemo, useState } from "react";
import { formatISTDateTime } from "../../../lib/datetime";
import DataState from "../../../components/ui/DataState";
import "../styles/customer-bank-details.css";

type RecentActivityItem = {
  id: string;
  loan_id?: number;
  loan_type?: string;
  type?: string;
  amount?: number;
  balance_after?: number;
  created_at?: string;
};

const txnTitle = (typeRaw?: string) => {
  const t = String(typeRaw || "").toLowerCase().trim();
  if (!t) return "Transaction";
  if (t.includes("disburse")) return "Disbursement";
  if (t.includes("emi") || t.includes("repay")) return "EMI Payment";
  if (t.includes("debit")) return "Wallet Debit";
  if (t.includes("credit") || t.includes("add")) return "Wallet Credit";
  return t.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
};

const txnDirection = (item: RecentActivityItem) => {
  const rawAmt = Number(item.amount ?? 0);
  const t = String(item.type || "").toLowerCase();
  if (rawAmt > 0 || t.includes("credit") || t.includes("disburse") || t.includes("add")) return "credit";
  if (rawAmt < 0 || t.includes("debit") || t.includes("emi") || t.includes("repay")) return "debit";
  return "info";
};

const txnActor = (item: RecentActivityItem & Record<string, unknown>) => {
  const byRaw =
    item.performed_by_name ||
    item.performed_by ||
    item.initiated_by ||
    item.created_by ||
    item.source ||
    item.channel;
  const by = String(byRaw || "").trim();
  return by || "System";
};

const txnReference = (item: RecentActivityItem & Record<string, unknown>) => {
  const refRaw = item.reference_id || item.reference || item.utr || item.order_id || item.payment_id;
  const ref = String(refRaw || "").trim();
  if (ref) return ref;
  return String(item.id || "-");
};

export default function CustomerWallet({
  accountNumber = "-",
  ifsc = "-",
  balance = 0,
  recentActivity = [],
  onAddMoney,
  onDebitMoney,
  page = 1,
  pageSize = 10,
  total = 0,
  onPageChange,
  onPageSizeChange,
}: {
  accountNumber?: string;
  ifsc?: string;
  balance?: number;
  recentActivity?: RecentActivityItem[];
  onAddMoney?: () => Promise<void> | void;
  onDebitMoney?: () => Promise<void> | void;
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}) {
  const [search, setSearch] = useState("");
  const [direction, setDirection] = useState<"all" | "credit" | "debit">("all");
  const [period, setPeriod] = useState<"all" | "7d" | "30d" | "90d">("all");
  const [failedOnly, setFailedOnly] = useState(false);

  const filteredActivity = useMemo(() => {
    const now = Date.now();
    return (recentActivity || []).filter((item) => {
      const d = txnDirection(item);
      if (direction !== "all" && d !== direction) return false;

      if (period !== "all") {
        const created = item.created_at ? Date.parse(item.created_at) : NaN;
        if (!Number.isFinite(created)) return false;
        const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
        if (now - created > days * 24 * 60 * 60 * 1000) return false;
      }

      const hay = `${item.id} ${item.type || ""} ${item.loan_id || ""} ${item.loan_type || ""}`.toLowerCase();
      if (search.trim() && !hay.includes(search.trim().toLowerCase())) return false;

      if (failedOnly) {
        const label = String(item.type || "").toLowerCase();
        if (!label.includes("fail")) return false;
      }
      return true;
    });
  }, [direction, failedOnly, period, recentActivity, search]);

  return (
    <section className="bankdash-root" aria-label="Wallet">
      <div className="bankdash-header">
        <h2>Wallet</h2>
        <p>Secure balance, statement export, and transaction reconciliation.</p>
      </div>

      <article className="bankdash-card">
        <h3>Your Virtual Account</h3>
        <div className="bankdash-kv-list">
          <div>
            <span>Account Number</span>
            <strong>{accountNumber}</strong>
          </div>
          <div>
            <span>IFSC Code</span>
            <strong>{ifsc}</strong>
          </div>
          <div>
            <span>Available Balance</span>
            <strong>Rs {Number(balance || 0).toLocaleString("en-IN")}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong className="ds-badge ds-badge--verified">Verified Wallet</strong>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div className="bankdash-actions-row">
            <button type="button" className="bankdash-btn-primary" onClick={() => onAddMoney?.()}>
              Add Money
            </button>
            <button type="button" className="bankdash-btn-outline bankdash-btn-outline--danger" onClick={() => onDebitMoney?.()}>
              Debit
            </button>
          </div>
        </div>
      </article>

      <article className="bankdash-card">
        <h3>Transaction History</h3>

        <div className="wallet-filter-row" style={{ marginBottom: 12 }}>
          <label>
            Search
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Txn ID, loan ID, type"
              aria-label="Search transactions"
            />
          </label>
          <label>
            Type
            <select value={direction} onChange={(e) => setDirection(e.target.value as "all" | "credit" | "debit")}>
              <option value="all">All</option>
              <option value="credit">Credits</option>
              <option value="debit">Debits</option>
            </select>
          </label>
          <label>
            Date Range
            <select value={period} onChange={(e) => setPeriod(e.target.value as "all" | "7d" | "30d" | "90d")}>
              <option value="all">All time</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </label>
          <label>
            Failed
            <select value={failedOnly ? "yes" : "no"} onChange={(e) => setFailedOnly(e.target.value === "yes")}>
              <option value="no">All</option>
              <option value="yes">Failed only</option>
            </select>
          </label>
        </div>

        {!filteredActivity.length ? (
          <DataState
            variant="empty"
            title="No transactions yet"
            message="Add money or make your first EMI payment to generate wallet activity."
            ctaLabel="Add Money"
            onCta={() => onAddMoney?.()}
          />
        ) : (
          <>
            <ul className="bankdash-activity-list">
              {filteredActivity.map((item) => {
                const rawAmt = Number(item.amount ?? 0);
                const typeLabel = txnTitle(item.type);
                const directionLabel = txnDirection(item);
                const isCredit = directionLabel === "credit";
                const signed = directionLabel === "credit" ? "+" : directionLabel === "debit" ? "-" : "";
                const amountAbs = Number.isFinite(rawAmt) ? Math.abs(rawAmt) : 0;
                const amountLabel = `INR ${amountAbs.toLocaleString("en-IN")}`;
                const loanLabel = item.loan_id ? `Loan #${item.loan_id}` : "Wallet Account";
                const dateLabel = item.created_at
                  ? formatISTDateTime(item.created_at, {
                      year: "numeric",
                      month: "short",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })
                  : "-";
                const balAfter = Number(item.balance_after);
                const balLabel = Number.isFinite(balAfter) ? `Bal INR ${Math.round(balAfter).toLocaleString("en-IN")}` : "";
                const actorLabel = txnActor(item as RecentActivityItem & Record<string, unknown>);
                const reference = txnReference(item as RecentActivityItem & Record<string, unknown>);
                return (
                  <li key={item.id} className="bankdash-txn-row">
                    <div className="bankdash-txn-main">
                      <div className="bankdash-activity-title">{typeLabel}</div>
                      <div className="bankdash-txn-tags">
                        <span className={`bankdash-pill ${directionLabel === "credit" ? "success" : directionLabel === "debit" ? "danger" : "info"}`}>
                          {directionLabel === "credit" ? "Credit" : directionLabel === "debit" ? "Debit" : "Info"}
                        </span>
                        <span className="bankdash-txn-id">Txn ID: {String(item.id || "-")}</span>
                      </div>
                      <div className="bankdash-activity-meta bankdash-activity-meta--txn">
                        <span>{loanLabel}</span>
                        <span>{dateLabel}</span>
                        <span>By {actorLabel}</span>
                        <span>Ref {reference}</span>
                        {balLabel ? <span>{balLabel}</span> : null}
                      </div>
                    </div>
                    <div className="bankdash-txn-amount-wrap">
                      <strong className={isCredit ? "bankdash-amount bankdash-amount--credit" : "bankdash-amount bankdash-amount--debit"}>
                        {signed} {amountLabel}
                      </strong>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button className="ds-btn ds-btn--secondary" onClick={() => onPageChange?.(Math.max(1, (page || 1) - 1))} disabled={(page || 1) <= 1}>
                  Prev
                </button>
                <div className="muted">
                  Page {page || 1} of {Math.max(1, Math.ceil((total || 0) / (pageSize || 10)))}
                </div>
                <button
                  className="ds-btn ds-btn--secondary"
                  onClick={() => onPageChange?.(Math.min(Math.max(1, Math.ceil((total || 0) / (pageSize || 10))), (page || 1) + 1))}
                  disabled={(page || 1) >= Math.ceil((total || 0) / (pageSize || 10))}
                >
                  Next
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <label className="muted">Rows:</label>
                <select value={pageSize} onChange={(e) => onPageSizeChange?.(Number(e.target.value))}>
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          </>
        )}
      </article>
    </section>
  );
}

