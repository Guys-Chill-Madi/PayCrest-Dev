import { useEffect, useMemo, useState } from "react";
import DataState from "../../../components/ui/DataState";

interface LoanSummary {
  loanId: string;
  customerName: string;
  amount: string;
  interestRate: string;
  tenure: string;
}

interface EmiStatus {
  monthlyEmi: string;
  nextDueDate: string;
  status: string;
  paidOn: string;
  totalPaid: string;
  balance: string;
  overdue: string;
  remarks: string;
}

interface QuickAction {
  label: string;
  onClick?: () => void;
}

interface ScheduleRow {
  no: number;
  dueDate: string;
  principal: string;
  interest: string;
  total: string;
  status: string;
}

interface PaymentRow {
  no: number;
  dueDate: string;
  paidDate: string;
  amount: string;
  status: string;
}

interface EmiRepaymentProps {
  title?: string;
  loanSummary: LoanSummary;
  emiStatus: EmiStatus;
  quickActions: QuickAction[];
  upcomingPayments: ScheduleRow[];
  paymentHistory: PaymentRow[];
  upcomingFooterNote?: string;
  historyFooterNote?: string;
  upcomingEmptyTitle?: string;
  upcomingEmptyMessage?: string;
  historyEmptyTitle?: string;
  historyEmptyMessage?: string;
}

type PaginationProps = {
  ariaLabel: string;
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (nextPage: number) => void;
};

function getPageItems(page: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const items: Array<number | "ellipsis"> = [];
  const pushPage = (p: number) => items.push(p);
  const pushEllipsis = () => {
    if (items[items.length - 1] !== "ellipsis") items.push("ellipsis");
  };

  pushPage(1);

  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);

  if (start > 2) pushEllipsis();
  for (let p = start; p <= end; p += 1) pushPage(p);
  if (end < totalPages - 1) pushEllipsis();

  pushPage(totalPages);

  return items;
}

function Pagination({ ariaLabel, page, pageSize, totalItems, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalPages <= 1) return null;

  const clampedPage = Math.min(Math.max(1, page), totalPages);
  const from = (clampedPage - 1) * pageSize + 1;
  const to = Math.min(totalItems, clampedPage * pageSize);
  const pageItems = getPageItems(clampedPage, totalPages);

  return (
    <nav className="emi-pagination" aria-label={ariaLabel}>
      <div className="emi-pagination__meta">
        Showing {from}-{to} of {totalItems}
      </div>
      <div className="emi-pagination__controls">
        <button
          type="button"
          className="emi-page-btn"
          onClick={() => onPageChange(clampedPage - 1)}
          disabled={clampedPage <= 1}
        >
          Prev
        </button>
        <div className="emi-page-list" role="list">
          {pageItems.map((item, idx) =>
            item === "ellipsis" ? (
              <span key={`e-${idx}`} className="emi-page-ellipsis" aria-hidden="true">
                ...
              </span>
            ) : (
              <button
                key={item}
                type="button"
                className={`emi-page-btn ${item === clampedPage ? "emi-page-btn--active" : ""}`}
                onClick={() => onPageChange(item)}
                aria-current={item === clampedPage ? "page" : undefined}
              >
                {item}
              </button>
            ),
          )}
        </div>
        <button
          type="button"
          className="emi-page-btn"
          onClick={() => onPageChange(clampedPage + 1)}
          disabled={clampedPage >= totalPages}
        >
          Next
        </button>
      </div>
    </nav>
  );
}

export default function EmiRepayment({
  title = "EMI Repayment",
  loanSummary,
  emiStatus,
  quickActions,
  upcomingPayments,
  paymentHistory,
  upcomingFooterNote = "Showing upcoming payments.",
  historyFooterNote = "Showing payment history.",
  upcomingEmptyTitle = "No EMI scheduled",
  upcomingEmptyMessage = "A payment schedule will appear here after your loan is disbursed.",
  historyEmptyTitle = "No payment history yet",
  historyEmptyMessage = "Completed payments will appear with date and status.",
}: EmiRepaymentProps) {
  const upcomingPageSize = 10;
  const historyPageSize = 10;

  const [upcomingPage, setUpcomingPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);

  const upcomingTotalPages = Math.max(1, Math.ceil(upcomingPayments.length / upcomingPageSize));
  const historyTotalPages = Math.max(1, Math.ceil(paymentHistory.length / historyPageSize));

  useEffect(() => {
    setUpcomingPage((p) => Math.min(Math.max(1, p), upcomingTotalPages));
  }, [upcomingTotalPages]);

  useEffect(() => {
    setHistoryPage((p) => Math.min(Math.max(1, p), historyTotalPages));
  }, [historyTotalPages]);

  const upcomingSlice = useMemo(() => {
    const start = (upcomingPage - 1) * upcomingPageSize;
    return upcomingPayments.slice(start, start + upcomingPageSize);
  }, [upcomingPage, upcomingPageSize, upcomingPayments]);

  const historySlice = useMemo(() => {
    const start = (historyPage - 1) * historyPageSize;
    return paymentHistory.slice(start, start + historyPageSize);
  }, [historyPage, historyPageSize, paymentHistory]);

  return (
    <div className="emi-page">
      <h2 className="emi-title">{title}</h2>

      <section className="emi-card">
        <div className="emi-card__header">Loan Summary</div>
        <div className="emi-grid">
          <div>
            <div className="emi-label">Loan ID</div>
            <div className="emi-value">{loanSummary.loanId}</div>
          </div>
          <div>
            <div className="emi-label">Customer</div>
            <div className="emi-value">{loanSummary.customerName}</div>
          </div>
          <div>
            <div className="emi-label">Amount</div>
            <div className="emi-value">{loanSummary.amount}</div>
          </div>
          <div>
            <div className="emi-label">Interest</div>
            <div className="emi-value">{loanSummary.interestRate}</div>
          </div>
          <div>
            <div className="emi-label">Tenure</div>
            <div className="emi-value">{loanSummary.tenure}</div>
          </div>
        </div>
      </section>

      <section className="emi-card">
        <div className="emi-card__header">EMI Status</div>
        <div className="emi-table">
          <div className="emi-table__row">
            <span>Monthly EMI</span>
            <strong>{emiStatus.monthlyEmi}</strong>
            <span>Next Due</span>
            <strong>{emiStatus.nextDueDate}</strong>
            <span>Status</span>
            <strong>{emiStatus.status}</strong>
            <span>Paid On</span>
            <strong>{emiStatus.paidOn}</strong>
          </div>
          <div className="emi-table__row">
            <span>Total Paid</span>
            <strong>{emiStatus.totalPaid}</strong>
            <span>Balance</span>
            <strong>{emiStatus.balance}</strong>
            <span>Overdue</span>
            <strong>{emiStatus.overdue}</strong>
            <span>Remarks</span>
            <strong>{emiStatus.remarks}</strong>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <span
            className={
              String(emiStatus.status || "")
                .toLowerCase()
                .includes("paid")
                ? "ds-badge ds-badge--verified"
                : String(emiStatus.status || "")
                    .toLowerCase()
                    .includes("pending")
                  ? "ds-badge ds-badge--pending"
                  : "ds-badge ds-badge--restricted"
            }
          >
            {emiStatus.status || "Unknown"}
          </span>
          <span className="ds-badge ds-badge--verified">Secure payment protected</span>
        </div>
      </section>

      <section className="emi-card">
        <div className="emi-card__header">Quick Actions</div>
        <div className="emi-actions">
          {quickActions.map((action) => (
            <button
              key={action.label}
              className="emi-action"
              type="button"
              onClick={action.onClick}
              disabled={!action.onClick}
            >
              {action.label}
            </button>
          ))}
        </div>
      </section>

      <section className="emi-card">
        <div className="emi-card__header">Upcoming Payments</div>
        {!upcomingPayments.length ? (
          <DataState
            variant="empty"
            title={upcomingEmptyTitle}
            message={upcomingEmptyMessage}
          />
        ) : (
          <>
            <div className="emi-table">
              <div className="emi-table__row emi-table__row--head emi-table__row--six">
                <span>No</span>
                <span>Due Date</span>
                <span>Principal</span>
                <span>Interest</span>
                <span>Total</span>
                <span>Status</span>
              </div>
              {upcomingSlice.map((row) => (
                <div key={row.no} className="emi-table__row emi-table__row--six">
                  <span>{row.no}</span>
                  <span>{row.dueDate}</span>
                  <span>{row.principal}</span>
                  <span>{row.interest}</span>
                  <span>{row.total}</span>
                  <span>{row.status}</span>
                </div>
              ))}
            </div>
            <Pagination
              ariaLabel="Upcoming payments pagination"
              page={upcomingPage}
              pageSize={upcomingPageSize}
              totalItems={upcomingPayments.length}
              onPageChange={setUpcomingPage}
            />
          </>
        )}
        <p className="emi-footer">{upcomingFooterNote}</p>
      </section>

      <section className="emi-card">
        <div className="emi-card__header">Payment History</div>
        {!paymentHistory.length ? (
          <DataState variant="empty" title={historyEmptyTitle} message={historyEmptyMessage} />
        ) : (
          <>
            <div className="emi-table">
              <div className="emi-table__row emi-table__row--head">
                <span>No</span>
                <span>Due Date</span>
                <span>Paid Date</span>
                <span>Amount</span>
                <span>Status</span>
              </div>
              {historySlice.map((row) => (
                <div key={row.no} className="emi-table__row">
                  <span>{row.no}</span>
                  <span>{row.dueDate}</span>
                  <span>{row.paidDate}</span>
                  <span>{row.amount}</span>
                  <span>{row.status}</span>
                </div>
              ))}
            </div>
            <Pagination
              ariaLabel="Payment history pagination"
              page={historyPage}
              pageSize={historyPageSize}
              totalItems={paymentHistory.length}
              onPageChange={setHistoryPage}
            />
          </>
        )}
        <p className="emi-footer">{historyFooterNote}</p>
      </section>
    </div>
  );
}

