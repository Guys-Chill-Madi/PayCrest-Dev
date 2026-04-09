import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../../../styles/verification.css";
import {
  adminApprove,
  adminDisburse,
  adminPendingApprovals,
  adminSanction,
  adminSigned,
  apiBaseUrl,
  getSession,
} from '../../../modules/admin/services/adminApi';
import { maskAadhaar, maskPan } from "../../../lib/masking";
import { getLoanStatusClass, getLoanStatusLabel } from "../../../lib/workflow";
import DataState from "../../../components/ui/DataState";

type LoanRecord = {
  loan_id: number;
  customer_id?: string | number;
  full_name?: string;
  loan_amount?: number;
  tenure_months?: number;
  loan_purpose?: string;
  bank_account_number?: string | number;
  pan_number?: string;
  salary_income?: number;
  monthly_avg_balance?: number;
  guarantor_name?: string;
  guarantor_phone?: string;
  guarantor_pan?: string;
  applied_at?: string | number;
  status?: string;
  vehicle_type?: string;
  vehicle_model?: string;
  pay_slip?: string;
  vehicle_price_doc?: string;
  home_property_doc?: string;
  fees_structure?: string;
  bonafide_certificate?: string;
  collateral_doc?: string;
};

export default function AdminReviewPage() {
  const { loanId } = useParams();
  const nav = useNavigate();
  const [loan, setLoan] = useState<LoanRecord | null>(null);
  const [status, setStatus] = useState<string>("pending_admin_approval");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [docOpening, setDocOpening] = useState(false);
  const [preview, setPreview] = useState<{ title: string; url: string; contentType: string } | null>(null);
  const [disburseConfirmOpen, setDisburseConfirmOpen] = useState(false);
  const [error, setError] = useState<any | null>(null);
  const { collection, id } = useMemo(() => {
    const raw = loanId || "";
    const [maybeCollection, maybeId] = raw.split(":");
    if (maybeId) return { collection: maybeCollection, id: maybeId };
    return { collection: "personal_loans", id: raw };
  }, [loanId]);
  const loanCollection = ["personal_loans", "vehicle_loans", "education_loans", "home_loans"].includes(collection)
    ? (collection as any)
    : "personal_loans";
  const requiresAdminApproval = (loan?.loan_amount || 0) > 1500000;

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== "admin") {
      nav("/login/staff/admin");
      return;
    }
    const load = async () => {
      setError(null);
      try {
        const loans = await adminPendingApprovals();
        const found = loans.find((l: LoanRecord) => String(l.loan_id) === String(id));
        if (found) {
          setLoan(found);
          setStatus(String(found.status || "pending_admin_approval"));
        } else {
          setLoan(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to load loan"));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id, nav]);

  const submitAdvance = async (action: "approve" | "sanction" | "signed" | "disburse") => {
    setSubmitting(true);
    setError(null);
    try {
      if (action === "approve") {
        await adminApprove(loanCollection, id);
        setStatus("admin_approved");
      } else if (action === "sanction") {
        await adminSanction(loanCollection, id);
        setStatus("sanction_sent");
      } else if (action === "signed") {
        await adminSigned(loanCollection, id);
        setStatus("signed_received");
      } else if (action === "disburse") {
        await adminDisburse(loanCollection, id);
        setStatus("active");
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to submit decision"));
    } finally {
      setSubmitting(false);
    }
  };

  const advance = async (action: "approve" | "sanction" | "signed" | "disburse") => {
    if (action === "disburse" && Number(loan?.loan_amount || 0) >= 1_000_000) {
      setDisburseConfirmOpen(true);
      return;
    }
    await submitAdvance(action);
  };

  const canApprove = status === "pending_admin_approval" && requiresAdminApproval;
  const canSanction = ["admin_approved", "manager_approved"].includes(String(status || "").toLowerCase());
  const canMarkSigned = status === "sanction_sent";
  const canDisburse = status === "ready_for_disbursement";

  type DocKey =
    | "pay_slip"
    | "vehicle_price_doc"
    | "home_property_doc"
    | "fees_structure"
    | "bonafide_certificate"
    | "collateral_doc";

  const resolveDocUrl = (raw: string, docType: DocKey) => {
    const v = String(raw || "").trim();
    if (!v) return null;
    if (v.startsWith("http://") || v.startsWith("https://")) return v;
    if (v.startsWith("/")) return `${apiBaseUrl}${v}`;
    return `${apiBaseUrl}/admin/loans/${encodeURIComponent(String(id))}/documents/${encodeURIComponent(docType)}`;
  };

  const docSpecs = useMemo(() => {
    const specs: Array<{ key: DocKey; label: string; optional?: boolean }> = [];

    if (loanCollection === "education_loans") {
      specs.push({ key: "fees_structure", label: "Fees Structure" });
      specs.push({ key: "bonafide_certificate", label: "Bonafide Certificate" });
      specs.push({ key: "collateral_doc", label: "Collateral Document", optional: true });
      return specs;
    }

    specs.push({ key: "pay_slip", label: "Pay Slip" });

    if (loanCollection === "vehicle_loans") {
      specs.push({ key: "vehicle_price_doc", label: "Vehicle Price Doc" });
    } else if (loanCollection === "home_loans") {
      specs.push({ key: "home_property_doc", label: "Home Property Document" });
    }

    return specs;
  }, [loanCollection]);

  const fetchDocBlob = async (url: string) => {
    const session = getSession();
    if (!session) throw new Error("Not authenticated");
    const res = await fetch(url, { headers: { Authorization: `Bearer ${session.accessToken}`, Accept: "*/*" }, cache: "no-store" });
    if (!res.ok) throw new Error("Failed to download document");
    const blob = await res.blob();
    if (!blob || blob.size <= 0) throw new Error("Empty document");
    return blob;
  };

  const viewDoc = async (title: string, maybeUrl: string | null) => {
    if (!maybeUrl) return;
    setDocOpening(true);
    setError(null);
    try {
      const blob = await fetchDocBlob(maybeUrl);
      const blobUrl = URL.createObjectURL(blob);
      setPreview({ title, url: blobUrl, contentType: blob.type || "application/octet-stream" });
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load document preview"));
    } finally {
      setDocOpening(false);
    }
  };

  const openBlobUrl = (blobUrl: string) => {
    const win = window.open("", "_blank", "noopener,noreferrer");
    if (!win) {
      setError("Popup blocked. Allow popups to view documents.");
      return;
    }
    win.location.href = blobUrl;
  };

  const primaryAction = canApprove
    ? { label: "Approve Loan", onClick: () => advance("approve"), className: "btn primary" }
    : canSanction
      ? { label: "Send Sanction Letter", onClick: () => advance("sanction"), className: "btn primary" }
      : canMarkSigned
        ? { label: "Mark Signed Received", onClick: () => advance("signed"), className: "btn primary" }
        : canDisburse
          ? { label: "Disburse Funds", onClick: () => advance("disburse"), className: "btn success" }
          : null;

  if (loading) {
    return (
      <div className="verification-page manager-page">
        <div className="verification-container">
          <DataState variant="loading" title="Loading admin review" message="Fetching approval context and loan details." />
        </div>
      </div>
    );
  }

  return (
    <div className="verification-page manager-page">
      <div className="verification-container">
        <div className="vstack">
          {disburseConfirmOpen ? (
            <div className="prompt-modal" role="dialog" aria-modal="true" aria-label="Confirm disbursement">
              <div className="prompt-modal__backdrop" onClick={() => (submitting ? null : setDisburseConfirmOpen(false))} />
              <div className="prompt-modal__panel">
                <div className="prompt-modal__head">
                  <div className="prompt-modal__title">Confirm High-Value Disbursement</div>
                </div>
                <div className="prompt-modal__body">
                  <div className="admin-review-confirm__amount">
                    INR {Number(loan?.loan_amount || 0).toLocaleString("en-IN")}
                  </div>
                  <div className="muted">
                    This disbursement will be processed immediately. Please confirm to continue.
                  </div>
                </div>
                <div className="prompt-modal__actions">
                  <button
                    type="button"
                    className="btn compact"
                    onClick={() => setDisburseConfirmOpen(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn compact danger"
                    onClick={async () => {
                      setDisburseConfirmOpen(false);
                      await submitAdvance("disburse");
                    }}
                    disabled={submitting}
                  >
                    Confirm Disburse
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="verification-hero admin-review-hero">
            <div className="hero-main">
              <div className="hero-title">Admin Review</div>
              <div className="hero-sub">Loan reference {loan?.loan_id ?? loanId ?? "-"}</div>
            </div>
            <div className="hero-actions">
              {primaryAction && (
                <button className={primaryAction.className} onClick={primaryAction.onClick} disabled={submitting}>
                  {primaryAction.label}
                </button>
              )}
            </div>
          </div>

          {error ? <DataState variant="error" title="Action failed" message={String(error)} ctaLabel="Dismiss" onCta={() => setError(null)} /> : null}

          <div className="card admin-review-section">
            <div className="admin-review-section__head">
              <h3>Loan Summary</h3>
              <span className={`status-pill ${getLoanStatusClass(status)}`}>{getLoanStatusLabel(status)}</span>
            </div>
            {loan ? (
              <div className="detail-grid" style={{ marginTop: 8 }}>
                <div className="detail-item">
                  <div className="detail-label">Customer</div>
                  <div className="detail-value">{loan.customer_id ?? "-"}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Amount</div>
                  <div className="detail-value">INR {loan.loan_amount ?? "-"}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Tenure</div>
                  <div className="detail-value">{loan.tenure_months ?? "-"} months</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Purpose</div>
                  <div className="detail-value">{loan.loan_purpose ?? "-"}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Applied</div>
                  <div className="detail-value">{loan.applied_at ? new Date(loan.applied_at).toLocaleDateString() : "-"}</div>
                </div>
                {loan.vehicle_type && (
                  <div className="detail-item">
                    <div className="detail-label">Vehicle</div>
                    <div className="detail-value">{loan.vehicle_type}</div>
                  </div>
                )}
                {loan.vehicle_model && (
                  <div className="detail-item">
                    <div className="detail-label">Model</div>
                    <div className="detail-value">{loan.vehicle_model}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="muted">Loan details are unavailable. Use the actions below if you know the loan reference.</div>
            )}
          </div>

          {loan && (
            <div className="card admin-review-section">
              <h3>Applicant & Financial Details</h3>
              <div className="detail-grid" style={{ marginTop: 8 }}>
                <div className="detail-item">
                  <div className="detail-label">Full Name</div>
                  <div className="detail-value">{loan.full_name ?? "-"}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Bank Account</div>
                  <div className="detail-value">{loan.bank_account_number ?? "-"}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">PAN</div>
                  <div className="detail-value">{maskPan(loan.pan_number)}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Salary Income</div>
                  <div className="detail-value">{loan.salary_income ?? "-"}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Avg Balance</div>
                  <div className="detail-value">{loan.monthly_avg_balance ?? "-"}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Guarantor</div>
                  <div className="detail-value">{loan.guarantor_name ?? "-"}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Guarantor Phone</div>
                  <div className="detail-value">{loan.guarantor_phone ?? "-"}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Guarantor PAN</div>
                  <div className="detail-value">{maskPan(loan.guarantor_pan)}</div>
                </div>
                {"aadhar_number" in loan && (loan as any).aadhar_number ? (
                  <div className="detail-item">
                    <div className="detail-label">Aadhaar</div>
                    <div className="detail-value">{maskAadhaar((loan as any).aadhar_number)}</div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {loan && (
            <div className="card admin-review-section">
              <h3>Document Summary</h3>
              <div className="vstack" style={{ gap: 10 }}>
                {docSpecs.map((spec) => {
                  const raw = String((loan as any)?.[spec.key] || "").trim();
                  const available = !!raw;
                  const label = spec.optional ? `${spec.label} (optional)` : spec.label;
                  const url = available ? resolveDocUrl(raw, spec.key) : null;
                  return (
                    <div key={spec.key} className="hstack doc-row" style={{ justifyContent: "space-between" }}>
                      <div>
                        <div className="doc-title">{label}</div>
                        <div className="muted">{available ? "Uploaded" : spec.optional ? "Not uploaded" : "Missing"}</div>
                      </div>
                      <div className="hstack" style={{ gap: 10 }}>
                        {available ? (
                          <button
                            type="button"
                            className="btn compact"
                            onClick={() => void viewDoc(spec.label, url)}
                            disabled={docOpening}
                            title={`Open uploaded ${spec.label.toLowerCase()}`}
                          >
                            View
                          </button>
                        ) : null}
                        <span className={`status-pill ${available ? "status-approved" : "status-pending"}`}>
                          {available ? "available" : "missing"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {preview ? (
            <div className="doc-modal" role="dialog" aria-modal="true" aria-label="Document preview">
              <div className="doc-modal__backdrop" onClick={() => {
                try { URL.revokeObjectURL(preview.url); } catch { /* ignore */ }
                setPreview(null);
              }} />
              <div className="doc-modal__panel">
                <div className="doc-modal__head">
                  <div>
                    <div className="doc-modal__title">{preview.title}</div>
                    <div className="muted">{preview.contentType}</div>
                  </div>
                  <div className="hstack" style={{ gap: 10 }}>
                    <button type="button" className="btn compact" onClick={() => openBlobUrl(preview.url)}>
                      Open New Tab
                    </button>
                    <button type="button" className="btn compact" onClick={() => {
                      try { URL.revokeObjectURL(preview.url); } catch { /* ignore */ }
                      setPreview(null);
                    }}>
                      Close
                    </button>
                  </div>
                </div>
                <div className="doc-modal__body">
                  {preview.contentType.startsWith("image/") ? (
                    <img src={preview.url} alt={preview.title} className="doc-modal__img" />
                  ) : (
                    <iframe className="doc-modal__frame" src={preview.url} title={preview.title} />
                  )}
                </div>
              </div>
            </div>
          ) : null}

          <div className="card admin-review-section">
            <h3>Admin Actions</h3>
            <div className="hstack review-actions" style={{ marginTop: 10 }}>
              <button className="btn primary" disabled={!canApprove || submitting} onClick={() => advance("approve")}>
                Approve Loan
              </button>
              <button className="btn" disabled={!canSanction || submitting} onClick={() => advance("sanction")}>
                Send Sanction Letter
              </button>
              <button className="btn" disabled={!canMarkSigned || submitting} onClick={() => advance("signed")}>
                Mark Signed Received
              </button>
              <button className="btn success" disabled={!canDisburse || submitting} onClick={() => advance("disburse")}>
                Disburse Funds
              </button>
            </div>
            {!canDisburse && String(status || "").toLowerCase() === "signed_received" ? (
              <div className="muted" style={{ marginTop: 10 }}>
                Waiting for manager to verify signature. Disbursement is enabled after status becomes <b>ready_for_disbursement</b>.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}




