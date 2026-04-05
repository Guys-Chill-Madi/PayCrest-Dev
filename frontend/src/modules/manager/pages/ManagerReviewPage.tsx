import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../../../styles/verification.css";
import {
  apiBaseUrl,
  assignVerification,
  getSession,
  managerApprove,
  managerForwardToAdmin,
  managerLoans,
  managerReject,
  managerVerificationTeam,
  type VerificationTeamMember,
} from '../../../modules/manager/services/managerApi';
import { getLoanStatusClass, getLoanStatusLabel } from "../../../lib/workflow";
import { formatISTDate } from "../../../lib/datetime";
import { maskAadhaar, maskPan } from "../../../lib/masking";
import DataState from "../../../components/ui/DataState";
import TextPromptModal from "../../../components/TextPromptModal";

type LoanRecord = {
  loan_id?: number | string;
  _id?: string;
  customer_id?: string | number;
  full_name?: string;
  loan_amount?: number;
  tenure_months?: number;
  loan_purpose?: string;
  status?: string;
  bank_account_number?: string | number;
  pan_number?: string;
  salary_income?: number;
  monthly_avg_balance?: number;
  guarantor_name?: string;
  guarantor_phone?: string;
  guarantor_pan?: string;
  applied_at?: string | number;
  pay_slip?: string;
  vehicle_price_doc?: string;
  home_property_doc?: string;
  fees_structure?: string;
  bonafide_certificate?: string;
  collateral_doc?: string;
  vehicle_type?: string;
  vehicle_model?: string;
  loan_collection?: string;
};

export default function ManagerReviewPage() {
  const { loanId } = useParams();
  const nav = useNavigate();
  const [loan, setLoan] = useState<LoanRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any | null>(null);
  const [verificationId, setVerificationId] = useState("");
  const [verificationTeam, setVerificationTeam] = useState<VerificationTeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [docOpening, setDocOpening] = useState(false);
  const [preview, setPreview] = useState<{ title: string; url: string; contentType: string } | null>(null);
  const [forwardPromptOpen, setForwardPromptOpen] = useState(false);
  const { collection, id } = useMemo(() => {
    const raw = loanId || "";
    const [maybeCollection, maybeId] = raw.split(":");
    if (maybeId) return { collection: maybeCollection, id: maybeId };
    return { collection: "personal_loans", id: raw };
  }, [loanId]);
  const loanCollection = ["personal_loans", "vehicle_loans", "education_loans", "home_loans"].includes(collection)
    ? (collection as any)
    : "personal_loans";

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== "manager") {
      nav("/login/staff/manager");
      return;
    }
    const load = async () => {
      setError(null);
      setLoadingTeam(true);
      try {
        const [loans, verifiers] = await Promise.all([managerLoans(), managerVerificationTeam(true)]);
        const found = loans.find((l: any) => String(l.loan_id ?? l._id ?? l.id) === String(id));
        setVerificationTeam(Array.isArray(verifiers) ? verifiers : []);
        if (!found) {
          setError("Loan not found.");
          setLoan(null);
        } else {
          setLoan(found);
        }
      } catch (err) {
            setError(err instanceof Error ? err : new Error("Failed to load loan"));
      } finally {
        setLoadingTeam(false);
        setLoading(false);
      }
    };
    void load();
  }, [id, nav]);

  const status = String(loan?.status || "").toLowerCase();
  const canAssign = status === "applied";
  const canApprove = status === "verification_done";
  const requiresAdmin = (loan?.loan_amount || 0) > 1500000;
  const selectedVerifier = verificationTeam.find((m) => String(m._id) === verificationId.trim());

  const handleAssign = async () => {
    if (!verificationId.trim()) {
      setError("Please select a verification team member.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await assignVerification(loanCollection, id, verificationId.trim());
      nav("/manager");
    } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to assign verification"));
    } finally {
      setSubmitting(false);
    }
  };

  const submitDecision = async (approved: boolean, remarks?: string | null) => {
    setSubmitting(true);
    setError(null);
    try {
      if (approved) {
        if (requiresAdmin) {
          await managerForwardToAdmin(id, {
            recommendation: "approve",
            remarks: remarks && remarks.trim() ? remarks.trim() : null,
          });
        } else {
          await managerApprove(loanCollection, id);
        }
      } else {
        await managerReject(loanCollection, id);
      }
      nav("/manager");
    } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to submit decision"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecision = async (approved: boolean) => {
    if (approved && requiresAdmin) {
      setForwardPromptOpen(true);
      return;
    }
    await submitDecision(approved);
  };

  const handleForwardConfirm = async (remarksRaw: string) => {
    await submitDecision(true, remarksRaw);
  };

  const resolveDocUrl = (raw: string, docType: DocKey) => {
    const v = String(raw || "").trim();
    if (!v) return null;
    if (v.startsWith("http://") || v.startsWith("https://")) return v;
    if (v.startsWith("/")) return `${apiBaseUrl}${v}`;
    // Stored document ids (e.g. Mongo ObjectId) are not direct URLs; fetch through manager document endpoint.
    return `${apiBaseUrl}/manager/loans/${encodeURIComponent(String(id))}/documents/${encodeURIComponent(docType)}`;
  };

  type DocKey =
    | "pay_slip"
    | "vehicle_price_doc"
    | "home_property_doc"
    | "fees_structure"
    | "bonafide_certificate"
    | "collateral_doc";

  const docSpecs = useMemo(() => {
    const specs: Array<{ key: DocKey; label: string; optional?: boolean }> = [];

    if (loanCollection === "education_loans") {
      specs.push({ key: "fees_structure", label: "Fees Structure" });
      specs.push({ key: "bonafide_certificate", label: "Bonafide Certificate" });
      specs.push({ key: "collateral_doc", label: "Collateral Document", optional: true });
      return specs;
    }

    // Personal/Vehicle/Home loans require pay slip
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

  const openDoc = async (maybeUrl: string | null) => {
    if (!maybeUrl) return;
    setDocOpening(true);
    setError(null);
    const win = window.open("", "_blank", "noopener,noreferrer");
    try {
      const blob = await fetchDocBlob(maybeUrl);
      const blobUrl = URL.createObjectURL(blob);
      if (!win) throw new Error("Popup blocked. Allow popups to view documents.");
      win.location.href = blobUrl;
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 300000);
    } catch (err) {
      try { win?.close(); } catch { /* ignore */ }
      setError(err instanceof Error ? err : new Error("Failed to open document"));
    } finally {
      setDocOpening(false);
    }
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

  if (loading) {
    return (
      <div className="verification-page manager-page">
        <div className="verification-container">
          <DataState variant="loading" title="Loading manager review" message="Fetching loan details and verification context." />
        </div>
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="verification-page manager-page">
        <div className="verification-container">
          <DataState variant="empty" title="Loan not found" message="The selected loan is unavailable in your queue." />
        </div>
      </div>
    );
  }

  return (
    <div className="verification-page manager-page">
      <div className="verification-container">
        <div className="vstack">
          <TextPromptModal
            open={forwardPromptOpen}
            title="Forward to Admin"
            description={`High-value approval alert: INR ${Number(loan?.loan_amount || 0).toLocaleString("en-IN")}. Add remarks for admin review.`}
            label="Remarks for admin"
            placeholder="e.g. Applicant profile and documents verified. Recommended for approval."
            confirmText="Send to Admin"
            confirmVariant="primary"
            busy={submitting}
            onCancel={() => setForwardPromptOpen(false)}
            onConfirm={(v) => handleForwardConfirm(v)}
          />

          <div className="verification-hero admin-review-hero">
            <div className="hero-main">
              <div className="brand">
                <img src={new URL("../../../styles/paycrest-logo.png", import.meta.url).href} alt="PayCrest" className="brand-logo" />
                <div>
                  <div className="brand-title">PayCrest</div>
                  <div className="brand-sub">Manager Review</div>
                </div>
              </div>
              <div className="hero-title">Loan Review</div>
              <div className="hero-sub">Loan reference {loan._id ?? loan.loan_id ?? loanId ?? "-"}</div>
            </div>
            <div className="hero-actions">
              <button className="btn back" onClick={() => nav(-1)}>Back</button>
              {canApprove && (
                <button className="btn primary" onClick={() => handleDecision(true)} disabled={submitting}>
                  Approve Loan
                </button>
              )}
            </div>
          </div>

          {error ? <DataState variant="error" title="Review action failed" message={String(error)} ctaLabel="Dismiss" onCta={() => setError(null)} /> : null}

          <div className="card manager-review-card">
            <div className="hstack" style={{ justifyContent: "space-between" }}>
              <h3>Loan Summary</h3>
              <span className={`status-pill ${getLoanStatusClass(loan.status)}`}>{getLoanStatusLabel(loan.status)}</span>
            </div>
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
                <div className="detail-value">{loan.applied_at ? formatISTDate(loan.applied_at, { year: "numeric", month: "2-digit", day: "2-digit" }) : "-"}</div>
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
            <div className="muted" style={{ marginTop: 12 }}>
              {requiresAdmin ? "Loan amount exceeds INR 15,00,000. Manager approval will forward to Admin." : "Loan amount is within manager approval limit."}
            </div>
          </div>

          <div className="card manager-review-card">
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

          <div className="card manager-review-card">
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

          {canAssign && (
            <div className="card manager-review-card">
              <h3>Assign to Verification</h3>
              <select
                value={verificationId}
                onChange={(e) => setVerificationId(e.target.value)}
                disabled={loadingTeam || submitting}
                aria-label="Select verification team member"
              >
                <option value="">{loadingTeam ? "Loading verification team..." : "Select verification team member"}</option>
                {verificationTeam.map((member) => (
                  <option key={String(member._id)} value={String(member._id)}>
                    {(member.full_name || member.email || `Staff ${member._id}`)} ({member._id})
                  </option>
                ))}
              </select>
              {selectedVerifier ? (
                <div className="muted" style={{ marginTop: 10 }}>
                  Assigning to: <strong style={{ color: "var(--text-primary)" }}>{selectedVerifier.full_name || selectedVerifier.email || selectedVerifier._id}</strong>
                  {selectedVerifier.email ? ` | ${selectedVerifier.email}` : ""}
                </div>
              ) : null}
              {!loadingTeam && verificationTeam.length === 0 ? (
                <div className="form-message error" style={{ marginTop: 10 }}>
                  No active verification team members found.
                </div>
              ) : null}
              <div className="hstack manager-review-actions">
                <button className="btn" onClick={handleAssign} disabled={submitting || loadingTeam || verificationTeam.length === 0}>
                  Assign Verification
                </button>
              </div>
            </div>
          )}

          {canApprove && (
            <div className="card manager-review-card">
              <h3>Manager Decision</h3>
              <div className="hstack manager-review-actions">
                <button className="btn danger" onClick={() => handleDecision(false)} disabled={submitting}>
                  Reject Application
                </button>
                <button className="btn" onClick={() => handleDecision(true)} disabled={submitting}>
                  Approve Loan
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}




