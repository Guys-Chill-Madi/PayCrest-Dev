import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../../styles/verification.css";
import { formatISTTime } from "../../../lib/datetime";
import {
  getSession,
  managerLoans,
  managerPendingSignatureVerifications,
  managerSanctionLetterUrl,
  managerSignedSanctionLetterUrl,
  managerVerifySanctionSignature,
} from '../../../modules/manager/services/managerApi';
import { getLoanStatusClass, getLoanStatusLabel } from "../../../lib/workflow";
import { filterPendingSignatures, getLoanCollection, loanTypeLabel, partitionManagerLoans, type LoanRow } from "./managerQueue";
import TextPromptModal from "../../../components/TextPromptModal";

export default function ManagerSanctionLettersPage() {
  const nav = useNavigate();
  const [pendingSignatures, setPendingSignatures] = useState<LoanRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<any | null>(null);
  const [last, setLast] = useState<number | null>(null);
  const [remarksPrompt, setRemarksPrompt] = useState<{ loanId: number; approve: boolean } | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const [loans, sigLoans] = await Promise.all([managerLoans(), managerPendingSignatureVerifications()]);
      // keep partition call for consistency / server anomalies (some signature loans might still be in loans list)
      partitionManagerLoans(loans || []);
      setPendingSignatures(filterPendingSignatures(sigLoans || []));
      setLast(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load sanction letter queue"));
    } finally {
      setLoading(false);
    }
  };

  const openSignatureDecision = (loanId: number, approve: boolean) => {
    if (submitting) return;
    setRemarksPrompt({ loanId, approve });
  };

  const submitSignatureDecision = async (remarksRaw: string) => {
    if (!remarksPrompt) return;
    setSubmitting(true);
    setError(null);
    try {
      const remarks = String(remarksRaw || "").trim();
      await managerVerifySanctionSignature(remarksPrompt.loanId, { approve: remarksPrompt.approve, remarks: remarks ? remarks : null });
      setRemarksPrompt(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to verify signature"));
    } finally {
      setSubmitting(false);
    }
  };

  const fetchDocBlobUrl = async (url: string) => {
    const session = getSession();
    if (!session) throw new Error("Not authenticated");
    const res = await fetch(url, { headers: { Authorization: `Bearer ${session.accessToken}`, Accept: "*/*" }, cache: "no-store" });
    if (!res.ok) {
      let detail = "Failed to download document";
      try {
        const text = await res.text();
        if (text) {
          const data = JSON.parse(text);
          detail = String(data?.detail || data?.message || detail);
        }
      } catch {
        // ignore parse errors and keep fallback message
      }
      throw new Error(detail);
    }
    const blob = await res.blob();
    if (!blob || blob.size <= 0) throw new Error("Empty document");
    return URL.createObjectURL(blob);
  };

  const openDoc = async (url: string) => {
    setError(null);
    const win = window.open("about:blank", "_blank");
    if (win) {
      win.document.title = "Opening document...";
      win.document.body.innerHTML = "<p style='font-family: sans-serif; padding: 16px;'>Loading document...</p>";
    }
    try {
      const blobUrl = await fetchDocBlobUrl(url);
      if (!win) throw new Error("Popup blocked. Allow popups to view documents.");
      win.location.replace(blobUrl);
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 300000);
    } catch (err) {
      try { win?.close(); } catch { /* ignore */ }
      setError(err instanceof Error ? err : new Error("Failed to open document"));
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
      if (document.visibilityState !== "visible" || loading || submitting) return;
      void refresh();
    }, 15000);
    return () => window.clearInterval(timer);
  }, [loading, submitting]);

  const logoUrl = new URL("../../../styles/paycrest-logo.png", import.meta.url).href;

  return (
    <div className="verification-page manager-page">
      <div className="verification-container">
        <div className="vstack">
          <TextPromptModal
            open={!!remarksPrompt}
            title={remarksPrompt?.approve ? "Verify Signature" : "Reject Signature"}
            description="Add a short note for audit trail (optional)."
            label="Remarks (optional)"
            placeholder="e.g. Signature verified and matches records"
            confirmText={remarksPrompt?.approve ? "Verify" : "Reject"}
            confirmVariant={remarksPrompt?.approve ? "primary" : "danger"}
            busy={submitting}
            onCancel={() => setRemarksPrompt(null)}
            onConfirm={(v) => submitSignatureDecision(v)}
          />

          <div className="verification-hero">
            <div className="hero-main">
              <div className="brand">
                <img src={logoUrl} alt="PayCrest" className="brand-logo" />
                <div>
                  <div className="brand-title">PayCrest</div>
                </div>
              </div>
              <div className="hero-title">Sanction Letters</div>
              <div className="hero-sub">Verify customer-signed sanction letters before disbursement.</div>
            </div>
            <div className="hero-actions">
              {last ? <span className="muted">Updated {formatISTTime(last)}</span> : null}
              <button className="btn primary" onClick={refresh} disabled={loading}>
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          {error && <div className="form-message error">{error instanceof Error ? error.message : String(error)}</div>}

          <div className="card card-table">
            <div className="card-head">
              <div>
                <h3>Pending Signature Verification</h3>
                <p className="muted">Open the original + signed documents, then verify or reject.</p>
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingSignatures.length ? (
                  pendingSignatures.map((l) => {
                    const collection = getLoanCollection(l);
                    const originalUrl = managerSanctionLetterUrl(l.loan_id);
                    const signedUrl = managerSignedSanctionLetterUrl(l.loan_id);
                    return (
                      <tr key={`${collection}:${l.loan_id}:sig`}>
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
                        <td>
                          <div className="table-action-bar">
                            <button
                              type="button"
                              className="btn compact"
                              onClick={() => void openDoc(originalUrl)}
                              disabled={submitting}
                              title="Open the original sanction letter"
                            >
                              Open Original
                            </button>
                            <button
                              type="button"
                              className="btn compact"
                              onClick={() => void openDoc(signedUrl)}
                              disabled={submitting}
                              title="Open the customer-signed sanction letter"
                            >
                              Open Signed
                            </button>
                            <span className="divider" aria-hidden="true" />
                            <button
                              type="button"
                              className="btn compact primary"
                              onClick={() => openSignatureDecision(l.loan_id, true)}
                              disabled={submitting}
                              title="Verify signature and approve"
                            >
                              Verify
                            </button>
                            <button
                              type="button"
                              className="btn compact danger"
                              onClick={() => openSignatureDecision(l.loan_id, false)}
                              disabled={submitting}
                              title="Reject signature"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7}>
                      <div className="muted" style={{ textAlign: "center", padding: 20 }}>
                        No signatures pending verification
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}




