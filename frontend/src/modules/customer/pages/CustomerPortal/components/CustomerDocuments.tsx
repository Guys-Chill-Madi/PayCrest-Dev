import { useMemo, useState } from "react";
import type { LoanRecord } from "../utils";
import DataState from "../../../../../components/ui/DataState";

type Txn = {
  id?: string | number | null;
  loan_id?: number;
  loan_type?: string;
  type?: string;
  amount?: number;
  balance_after?: number;
  created_at?: string;
};

type TxnRow = Omit<Txn, "id"> & { id: string };

type Props = {
  kycStatusLabel: string;
  latestLoan?: LoanRecord;
  recentActivity: Txn[];
  onOpenKyc?: () => void;
  onOpenTrack?: () => void;
  onOpenSupport?: () => void;
  onDownloadSanction?: () => void;
  onDownloadNoc?: () => void;
  onExportTxCsv?: () => void;
};

const downloadText = (fileName: string, content: string, mime = "text/plain") => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noreferrer";
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export default function CustomerDocuments({
  kycStatusLabel,
  latestLoan,
  recentActivity,
  onOpenKyc,
  onOpenTrack,
  onOpenSupport,
  onDownloadSanction,
  onDownloadNoc,
  onExportTxCsv,
}: Props) {
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const tx = useMemo(() => {
    const items = Array.isArray(recentActivity) ? recentActivity : [];
    const normalized: TxnRow[] = items.map((t, inputIndex) => {
      const idCandidate = t.id == null ? "" : String(t.id);
      const fallbackId = `txn:${t.created_at ?? "na"}:${t.type ?? "na"}:${t.loan_id ?? "na"}:${inputIndex}`;
      const id = idCandidate.trim() ? idCandidate : fallbackId;
      return { ...t, id };
    });

    return normalized.slice().sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
  }, [recentActivity]);

  const selected = useMemo(() => tx.find((t) => t.id === selectedTxnId) || null, [selectedTxnId, tx]);
  const totalPages = Math.max(1, Math.ceil(tx.length / pageSize));
  const paginatedTx = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return tx.slice(startIndex, startIndex + pageSize);
  }, [currentPage, tx]);

  return (
    <div className="custx-root">
      <div className="custx-head">
        <div>
          <h2 style={{ margin: 0 }}>Documents & Statements</h2>
          <p className="custx-muted" style={{ marginTop: 6 }}>
            Download key documents and export your transaction history.
          </p>
        </div>
        <div className="custx-actions">
          <button type="button" className="custx-btn" onClick={onOpenSupport} disabled={!onOpenSupport}>
            Contact Support
          </button>
          <button type="button" className="custx-btn primary" onClick={onExportTxCsv} disabled={!onExportTxCsv}>
            Export CSV
          </button>
        </div>
      </div>

      <div className="custx-grid">
        <section className="custx-card">
          <h3 style={{ margin: 0 }}>KYC</h3>
          <p className="custx-muted" style={{ margin: "8px 0 12px" }}>
            Status: <strong>{kycStatusLabel}</strong>
          </p>
          <div className="custx-row">
            <button type="button" className="custx-btn custx-btn--kyc" onClick={onOpenKyc} disabled={!onOpenKyc}>
              View / Update KYC
            </button>
          </div>
        </section>

        <section className="custx-card">
          <h3 style={{ margin: 0 }}>Loan Documents</h3>
          <p className="custx-muted" style={{ margin: "8px 0 12px" }}>
            {latestLoan?.loan_id ? (
              <>
                Latest loan: <strong>#{latestLoan.loan_id}</strong>
              </>
            ) : (
              "No loan documents available yet."
            )}
          </p>
          <div className="custx-row">
            <button type="button" className="custx-btn primary" onClick={onDownloadSanction} disabled={!onDownloadSanction || !latestLoan?.loan_id}>
              Download Sanction Letter
            </button>
            <button type="button" className="custx-btn" onClick={onDownloadNoc} disabled={!onDownloadNoc || !latestLoan?.loan_id}>
              Download NOC Letter
            </button>
            <button type="button" className="custx-btn" onClick={onOpenTrack} disabled={!onOpenTrack || !latestLoan?.loan_id}>
              Track & Upload Signed Letter
            </button>
          </div>
          <p className="custx-muted" style={{ margin: "10px 0 0" }}>
            NOC letter is available after foreclosure/closure is processed.
          </p>
        </section>
      </div>

      <section className="custx-card" style={{ marginTop: 14 }}>
        <div className="custx-head" style={{ marginBottom: 10 }}>
          <div>
            <h3 style={{ margin: 0 }}>Receipts</h3>
            <p className="custx-muted" style={{ marginTop: 6 }}>
              Download a simple receipt for any wallet transaction.
            </p>
          </div>
        </div>

        {!tx.length ? (
          <DataState
            variant="empty"
            title="No transactions yet"
            message="Once you add money, repay EMI, or receive disbursement, receipts will be available here."
          />
        ) : (
          <div className="custx-table-wrap" role="region" aria-label="Transactions table">
            <table className="custx-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Loan</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {paginatedTx.map((t) => (
                  <tr key={t.id}>
                    <td>{t.created_at ? new Date(t.created_at).toLocaleString() : "-"}</td>
                    <td>{String(t.type || "-")}</td>
                    <td>{typeof t.amount === "number" ? t.amount.toLocaleString("en-IN") : String(t.amount ?? "-")}</td>
                    <td>{t.loan_id ? `#${t.loan_id}` : "-"}</td>
                    <td style={{ textAlign: "right" }}>
                      <button type="button" className="custx-link" onClick={() => setSelectedTxnId(t.id)}>
                        Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="custx-pagination">
              <span className="custx-muted">
                Page {currentPage} of {totalPages}
              </span>
              <div className="custx-row">
                <button
                  type="button"
                  className="custx-btn"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage <= 1}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="custx-btn"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {selected ? (
        <section className="custx-card" style={{ marginTop: 14 }}>
          <div className="custx-head">
            <div>
              <h3 style={{ margin: 0 }}>Receipt</h3>
              <p className="custx-muted" style={{ marginTop: 6 }}>
                Transaction: <strong>{selected.id}</strong>
              </p>
            </div>
            <div className="custx-actions">
              <button type="button" className="custx-btn" onClick={() => setSelectedTxnId(null)}>
                Close
              </button>
              <button
                type="button"
                className="custx-btn primary"
                onClick={() => {
                  const lines = [
                    "PayCrest Receipt",
                    "----------------",
                    `Transaction ID: ${selected.id}`,
                    `Date: ${selected.created_at ? new Date(selected.created_at).toLocaleString() : "-"}`,
                    `Type: ${String(selected.type || "-")}`,
                    `Amount: ${String(selected.amount ?? "-")}`,
                    `Balance After: ${String(selected.balance_after ?? "-")}`,
                    `Loan ID: ${selected.loan_id ?? "-"}`,
                    `Loan Type: ${selected.loan_type ?? "-"}`,
                  ];
                  downloadText(`receipt_${selected.id}.txt`, lines.join("\n"));
                }}
              >
                Download Receipt
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}




