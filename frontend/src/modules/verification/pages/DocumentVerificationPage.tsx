import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import "../../../styles/verification.css";
import BackButton from "../../../components/BackButton";
import DataState from "../../../components/ui/DataState";
import { downloadLoanDocumentUrl, getLoanDocuments, getSession, verifyLoan, verificationDashboard } from '../../../modules/verification/services/verificationApi';

type DocRow = {
  key: "pay_slip" | "vehicle_price_doc" | "home_property_doc" | "fees_structure" | "bonafide_certificate" | "collateral_doc";
  label: string;
  available: boolean;
};

export default function DocumentVerificationPage() {
  const { loanId } = useParams();
  const nav = useNavigate();
  const loc = useLocation();
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loanStatus, setLoanStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any | null>(null);
  const [decisioning, setDecisioning] = useState(false);
  const [docOpening, setDocOpening] = useState(false);
  const [preview, setPreview] = useState<{ title: string; url: string; contentType: string } | null>(null);
  const logoUrl = new URL("../../../styles/paycrest-logo.png", import.meta.url).href;

  const { collection, id } = useMemo(() => {
    const raw = loanId || "";
    const [maybeCollection, maybeId] = raw.split(":");
    if (maybeId) {
      return { collection: maybeCollection, id: maybeId };
    }
    return { collection: "personal_loans", id: raw };
  }, [loanId]);

  const loanCollection = ["personal_loans", "vehicle_loans", "education_loans", "home_loans"].includes(collection)
    ? (collection as any)
    : "personal_loans";
  const numericId = id || "";

  const readonlyFromQuery = useMemo(() => {
    try {
      const q = new URLSearchParams(loc.search);
      return q.get("readonly") === "1";
    } catch {
      return false;
    }
  }, [loc.search]);

  const isLockedByStatus = typeof loanStatus === "string" && loanStatus.length > 0 && loanStatus !== "assigned_to_verification";
  const readOnly = readonlyFromQuery || isLockedByStatus;

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== "verification") {
      nav("/login/staff/verification");
      return;
    }
    const load = async () => {
      setError(null);
      try {
        const data = await getLoanDocuments(numericId);
        try {
          const dash = await verificationDashboard();
          const pending =
            Array.isArray((dash as any).pending_loan_verifications)
              ? (dash as any).pending_loan_verifications
              : [
                  ...((Array.isArray((dash as any).pending_personal_loans) ? (dash as any).pending_personal_loans : []) as any[]),
                  ...((Array.isArray((dash as any).pending_vehicle_loans) ? (dash as any).pending_vehicle_loans : []) as any[]),
                  ...((Array.isArray((dash as any).pending_education_loans) ? (dash as any).pending_education_loans : []) as any[]),
                  ...((Array.isArray((dash as any).pending_home_loans) ? (dash as any).pending_home_loans : []) as any[]),
                ];
          const processed = Array.isArray((dash as any).processed_loan_verifications)
            ? (dash as any).processed_loan_verifications
            : Array.isArray((dash as any).processed_personal_loans)
              ? (dash as any).processed_personal_loans
              : [];

          const all = [...pending, ...processed];
          const match = all.find((r: any) => String(r?.loan_id) === String(numericId));
          const s = match?.status != null ? String(match.status) : null;
          setLoanStatus(s ? s.toLowerCase().trim() : null);
        } catch {
          setLoanStatus(null);
        }
        if (data?.error) {
          setError(String(data.error));
          setDocs([]);
        } else {
          const rows: DocRow[] = [];

          if (data?.pay_slip) {
            rows.push({ key: "pay_slip", label: "Pay Slip", available: true });
          } else if (loanCollection !== "education_loans") {
            rows.push({ key: "pay_slip", label: "Pay Slip", available: false });
          }

          if (loanCollection === "vehicle_loans") {
            rows.push({ key: "vehicle_price_doc", label: "Vehicle Price Doc", available: !!data?.vehicle_price_doc });
          } else if (loanCollection === "home_loans") {
            rows.push({ key: "home_property_doc", label: "Home Property Document", available: !!data?.home_property_doc });
          } else if (loanCollection === "education_loans") {
            rows.push({ key: "fees_structure", label: "Fees Structure", available: !!data?.fees_structure });
            rows.push({ key: "bonafide_certificate", label: "Bonafide Certificate", available: !!data?.bonafide_certificate });
            rows.push({ key: "collateral_doc", label: "Collateral Document (optional)", available: !!data?.collateral_doc });
          }
          setDocs(rows);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to load documents"));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [loanCollection, numericId, nav]);

  const handleDecision = async (approved: boolean) => {
    if (readOnly) return;
    setDecisioning(true);
    setError(null);
    try {
      await verifyLoan(loanCollection, numericId, approved);
      nav("/verification");
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to submit decision"));
    } finally {
      setDecisioning(false);
    }
  };

  const fetchDocBlobUrl = async (url: string) => {
    const session = getSession();
    if (!session) throw new Error("Not authenticated");
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    if (!res.ok) throw new Error("Failed to download document");
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  };

  const viewDoc = async (title: string, url: string) => {
    setDocOpening(true);
    setError(null);
    try {
      const blobUrl = await fetchDocBlobUrl(url);
      setPreview({ title, url: blobUrl, contentType: "application/pdf" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open document");
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
          <DataState variant="loading" title="Loading loan documents" message="Preparing document verification workspace." />
        </div>
      </div>
    );
  }

  return (
    <div className="verification-page manager-page">
      <div className="verification-container">
        <div className="vstack">
          <div className="verification-hero admin-review-hero">
            <div className="hero-main">
              <div className="brand">
                <img src={logoUrl} alt="PayCrest" className="brand-logo" />
                <div>
                  <div className="brand-title">PayCrest</div>
                  <div className="brand-sub">Document Verification Suite</div>
                </div>
              </div>
              <div className="hero-title">Document Review</div>
              <div className="hero-sub">Loan reference {numericId || "-"}</div>
            </div>
            <div className="hero-actions">
              <div className={`status-pill ${readOnly ? "status-info" : "status-pending"}`}>
                {readOnly ? "Read-only" : "Verification Pending"}
              </div>
              <BackButton className="btn back" fallback="/verification" />
              <button className="btn primary" onClick={() => handleDecision(true)} disabled={decisioning || readOnly}>
                Approve Loan
              </button>
            </div>
          </div>

          {readOnly ? (
            <div className="card" style={{ padding: 14 }}>
              <div className="muted">
                This loan already has a verification decision/status. Actions are disabled to avoid conflicts.
              </div>
            </div>
          ) : null}

          {error ? (
            <DataState variant="error" title="Document action failed" message={String(error)} ctaLabel="Dismiss" onCta={() => setError(null)} />
          ) : null}

          <div className="card manager-review-card">
            <h3>Document Summary</h3>
            <div className="vstack" style={{ gap: 10 }}>
              {docs.map((doc) => {
                const url = doc.available ? downloadLoanDocumentUrl(numericId, doc.key) : "";
                return (
                  <div key={doc.key} className="hstack doc-row" style={{ justifyContent: "space-between" }}>
                    <div>
                      <div className="doc-title">{doc.label}</div>
                      <div className="muted">{doc.available ? "Uploaded" : "Not uploaded"}</div>
                    </div>
                    <div className="hstack" style={{ gap: 10 }}>
                      {doc.available ? (
                        <button
                          type="button"
                          className="btn compact"
                          onClick={() => void viewDoc(doc.label, url)}
                          disabled={docOpening}
                          title={`Open uploaded ${doc.label.toLowerCase()}`}
                        >
                          View
                        </button>
                      ) : null}
                      <span className={`status-pill status-${doc.available ? "approved" : "pending"}`}>
                        {doc.available ? "available" : "missing"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            {!docs.length ? (
              <DataState
                variant="empty"
                title="No documents found"
                message="The applicant has not uploaded the required documents yet."
              />
            ) : null}
          </div>

          <div className="card">
            <div className="hstack review-actions">
              <button className="btn danger" onClick={() => handleDecision(false)} disabled={decisioning || readOnly}>
                Reject Loan
              </button>
              <button className="btn" onClick={() => handleDecision(true)} disabled={decisioning || readOnly}>
                Approve Loan
              </button>
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
                  <iframe className="doc-modal__frame" src={preview.url} title={preview.title} />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}




