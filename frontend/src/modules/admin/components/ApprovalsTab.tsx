import { useEffect, useMemo, useState } from "react";
import PopupMessage from "../../../components/PopupMessage";
import TextPromptModal from "../../../components/TextPromptModal";
import { formatISTTime } from "../../../lib/datetime";
import type { LoanRow } from "../adminQueue";
import {
  adminApprove,
  adminDisburse,
  adminSanction,
  adminSigned,
} from "../../../modules/admin/services/adminApi";
import { getLoanStatusClass, getLoanStatusLabel } from "../../../lib/workflow";
import { getLoanCollection, getLoanId, loanTypeLabel, normalizeStatus } from "../adminQueue";

type NextAction = "approve" | "sanction" | "signed" | "disburse";

const formatINR = (v?: number) =>
  typeof v === "number"
    ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v)
    : "-";

const getNextAction = (status?: string): { action: NextAction; label: string } | null => {
  const s = normalizeStatus(status);
  if (s === "pending_admin_approval" || s === "verification_done" || s === "manager_approved") {
    return { action: "approve", label: "Approve" };
  }
  if (s === "admin_approved") return { action: "sanction", label: "Send Sanction" };
  if (s === "sanction_sent") return { action: "signed", label: "Mark Signed" };
  if (s === "ready_for_disbursement") return { action: "disburse", label: "Disburse" };
  return null;
};

const parseSortValue = (loan: LoanRow, key: "applied_at" | "loan_amount" | "loan_id") => {
  if (key === "loan_id") return Number(loan.loan_id ?? (loan as any)._id ?? 0);
  if (key === "loan_amount") return Number(loan.loan_amount || 0);
  const raw = loan.applied_at;
  if (typeof raw === "number") return raw;
  const dt = raw ? Date.parse(String(raw)) : NaN;
  return Number.isFinite(dt) ? dt : 0;
};

export default function ApprovalsTab({
  pending,
  processed,
  loading,
  onRefresh,
  onReview,
  lastUpdated,
}: {
  pending: LoanRow[];
  processed: LoanRow[];
  loading: boolean;
  onRefresh: () => void;
  onReview: (collection: string, loanId: string | number) => void;
  lastUpdated: number | null;
}) {
  const [queueView, setQueueView] = useState<"pending" | "completed">("pending");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "personal" | "vehicle" | "education" | "home">("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"applied_at" | "loan_amount" | "loan_id">("applied_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<10 | 20 | 50>(10);
  const [error, setError] = useState<any | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [rejectPrompt, setRejectPrompt] = useState<{ collection: string; loanId: string | number } | null>(null);

  const rows = queueView === "pending" ? pending : processed;

  const counts = useMemo(() => {
    const base = { total: rows.length, pending_admin_approval: 0, manager_approved: 0, admin_approved: 0, sanction_sent: 0, signed_received: 0, ready_for_disbursement: 0 };
    rows.forEach((l) => {
      const s = normalizeStatus(l.status);
      if (s in base) (base as any)[s] += 1;
    });
    return base;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const typeOk = (loan: LoanRow) => {
      if (filterType === "all") return true;
      const collection = getLoanCollection(loan);
      if (filterType === "personal") return collection === "personal_loans";
      if (filterType === "vehicle") return collection === "vehicle_loans";
      if (filterType === "education") return collection === "education_loans";
      if (filterType === "home") return collection === "home_loans";
      return true;
    };
    const statusOk = (loan: LoanRow) => {
      if (filterStatus === "all") return true;
      return normalizeStatus(loan.status) === filterStatus;
    };
    const queryOk = (loan: LoanRow) => {
      if (!q) return true;
      const hay = [
        getLoanId(loan),
        loan.customer_id,
        loan.full_name,
        loan.status,
        getLoanCollection(loan),
      ]
        .map((v) => String(v ?? ""))
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    };

    const list = (queueView === "pending" ? pending : processed).filter((l) => typeOk(l) && statusOk(l) && queryOk(l));
    list.sort((a, b) => {
      const av = parseSortValue(a, sortBy);
      const bv = parseSortValue(b, sortBy);
      const diff = av - bv;
      return sortDir === "asc" ? diff : -diff;
    });
    return list;
  }, [filterStatus, filterType, pending, processed, queueView, search, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageStart = (page - 1) * pageSize;
  const pagedRows = filtered.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    setPage(1);
  }, [queueView, search, filterType, filterStatus, sortBy, sortDir, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const runAction = async (collection: string, loanId: string | number, action: NextAction) => {
    const key = `${collection}:${loanId}:${action}`;
    if (busyKey === key) return;

    setError(null);
    setNotice(null);
    setBusyKey(key);

    try {
      if (action === "approve") await adminApprove(collection, loanId);
      if (action === "sanction") await adminSanction(collection, loanId);
      if (action === "signed") await adminSigned(collection, loanId);
      if (action === "disburse") await adminDisburse(collection, loanId);

      setNotice(`Action "${action}" completed for loan ${loanId}.`);
      setTimeout(() => onRefresh(), 300);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Action failed"));
    } finally {
      setBusyKey(null);
    }
  };

  const openReject = (collection: string, loanId: string | number) => {
    const key = `${collection}:${loanId}:reject`;
    if (busyKey === key) return;
    setError(null);
    setNotice(null);
    setRejectPrompt({ collection, loanId });
  };

  const submitReject = async (reasonRaw: string) => {
    if (!rejectPrompt) return;
    const { collection, loanId } = rejectPrompt;
    const key = `${collection}:${loanId}:reject`;
    if (busyKey === key) return;
    setError(null);
    setNotice(null);
    setBusyKey(key);
    try {
      const reason = String(reasonRaw || "").trim();
      await (await import("../../../modules/admin/services/adminApi")).adminReject(
        loanId,
        reason || undefined,
      );
      setRejectPrompt(null);
      setNotice(`Loan ${loanId} rejected`);
      setTimeout(() => onRefresh(), 300);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Reject failed"));
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <>
      <TextPromptModal
        open={!!rejectPrompt}
        title="Reject Loan"
        description="Optionally add a reason for rejection. This will be saved in audit logs."
        label="Reason (optional)"
        placeholder="e.g. Policy criteria not met"
        confirmText="Reject"
        confirmVariant="danger"
        busy={busyKey === (rejectPrompt ? `${rejectPrompt.collection}:${rejectPrompt.loanId}:reject` : "")}
        onCancel={() => setRejectPrompt(null)}
        onConfirm={(v) => submitReject(v)}
      />
      {notice && <PopupMessage type="success" title="Success" message={notice} onClose={() => setNotice(null)} />}
      {error && <PopupMessage type="error" title="Error" message={error} onClose={() => setError(null)} />}

      <div className="card">
        <div className="tab-bar" role="tablist" aria-label="Admin approvals queue view">
          <button
            type="button"
            role="tab"
            aria-selected={queueView === "pending"}
            className={`tab-button ${queueView === "pending" ? "active" : ""}`}
            onClick={() => setQueueView("pending")}
          >
            Pending
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={queueView === "completed"}
            className={`tab-button ${queueView === "completed" ? "active" : ""}`}
            onClick={() => setQueueView("completed")}
          >
            Completed
          </button>
        </div>
      </div>

      <div className="summary-cards summary-cards--wide">
        <div className="summary-card">
          <span className="summary-label">{queueView === "pending" ? "Total" : "Completed"}</span>
          <span className="summary-value">{counts.total}</span>
          <span className="summary-sub">{lastUpdated ? `Updated ${formatISTTime(lastUpdated)}` : "-"}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Needs Approval</span>
          <span className="summary-value">{counts.pending_admin_approval}</span>
          <span className="summary-sub">Pending admin decision</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Ready for Sanction</span>
          <span className="summary-value">{counts.admin_approved + counts.manager_approved}</span>
          <span className="summary-sub">Approved, sanction next</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Ready to Disburse</span>
          <span className="summary-value">{counts.ready_for_disbursement}</span>
          <span className="summary-sub">Signature verified</span>
        </div>
      </div>

      <div className="card card-table">
        <div className="card-head">
          <div>
            <h3>{queueView === "pending" ? "Approvals Queue" : "Completed Approvals"}</h3>
            <p className="muted">
              {queueView === "pending"
                ? "Filter, review, and move applications through the final steps."
                : "Recently processed loans (disbursed/active/completed/foreclosed/rejected)."}
            </p>
          </div>
          <div className="hstack" style={{ gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search loan/customer/name..."
              style={{ width: 220 }}
              aria-label="Search approvals"
            />
            <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)} aria-label="Filter by type">
              <option value="all">All types</option>
              <option value="personal">Personal</option>
              <option value="vehicle">Vehicle</option>
              <option value="home">Home</option>
              <option value="education">Education</option>
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} aria-label="Filter by status">
              <option value="all">All statuses</option>
              <option value="pending_admin_approval">Needs approval</option>
              <option value="manager_approved">Manager approved</option>
              <option value="admin_approved">Approved</option>
              <option value="sanction_sent">Sanction sent</option>
              <option value="signed_received">Signed received</option>
              <option value="ready_for_disbursement">Ready for disbursement</option>
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} aria-label="Sort by">
              <option value="applied_at">Sort: applied date</option>
              <option value="loan_amount">Sort: amount</option>
              <option value="loan_id">Sort: loan id</option>
            </select>
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value) as 10 | 20 | 50)} aria-label="Rows per page">
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>
            <button
              type="button"
              className="btn"
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              title="Toggle sort direction"
            >
              {sortDir === "asc" ? "Asc" : "Desc"}
            </button>
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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8}>
                  <div className="muted" style={{ textAlign: "center", padding: 20 }}>Loading...</div>
                </td>
              </tr>
            ) : pagedRows.length ? (
              pagedRows.map((l) => {
                const collection = getLoanCollection(l);
                const next = getNextAction(l.status);
                const loanId = getLoanId(l);
                const key = `${collection}:${loanId}:${next?.action || "none"}`;
                return (
                  <tr key={`${collection}:${loanId}`}>
                    <td>{loanId}</td>
                    <td>
                      <div style={{ display: "grid", gap: 2 }}>
                        <span style={{ color: "var(--text-primary)", fontWeight: 800 }}>{l.customer_id ?? "-"}</span>
                        <span className="muted" style={{ fontSize: 12 }}>{l.full_name ?? ""}</span>
                      </div>
                    </td>
                    <td><span className="type-pill">{loanTypeLabel(collection)}</span></td>
                    <td>{formatINR(l.loan_amount)}</td>
                    <td>{l.tenure_months ?? "-"} M</td>
                    <td><span className={`status-pill ${getLoanStatusClass(l.status)}`}>{getLoanStatusLabel(l.status)}</span></td>
                    <td>{l.applied_at ? new Date(l.applied_at).toLocaleDateString() : "-"}</td>
                    <td className="hstack" style={{ gap: 8, flexWrap: "wrap" }}>
                      <button className="btn compact" onClick={() => onReview(collection, loanId)}>[Review]</button>
                      {queueView === "pending" && next ? (
                        <button
                          className="btn compact primary"
                          disabled={busyKey === key}
                          onClick={() => runAction(collection, loanId, next.action)}
                          title={`Run next step: ${next.label}`}
                        >
                          [{busyKey === key ? "Working..." : next.label}]
                        </button>
                      ) : null}
                      {queueView === "pending" && next && next.action === "approve" ? (
                        <button
                          className="btn compact danger"
                          disabled={busyKey === `${collection}:${loanId}:reject`}
                          onClick={() => openReject(collection, loanId)}
                          title="Reject this loan"
                        >
                          [Reject]
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8}>
                  <div className="empty-state">No loans match the current filters.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {!loading && filtered.length > 0 ? (
          <div className="hstack" style={{ justifyContent: "space-between", padding: "12px 14px", borderTop: "1px solid var(--border)", flexWrap: "wrap", gap: 10 }}>
            <span className="muted">
              Showing {pageStart + 1}-{Math.min(pageStart + pageSize, filtered.length)} of {filtered.length}
            </span>
            <div className="hstack" style={{ gap: 8 }}>
              <button type="button" className="btn compact" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                Prev
              </button>
              <span className="muted">Page {page} / {totalPages}</span>
              <button type="button" className="btn compact" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
