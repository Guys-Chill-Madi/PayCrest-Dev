import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import BackButton from "../../../components/BackButton";
import DataState from "../../../components/ui/DataState";
import "../../../styles/verification.css";
import { downloadKycDocumentUrl, getKyc, getSession, verifyKyc, adminGetSettings } from '../../../modules/verification/services/verificationApi';

type Scores = { income: number; emi: number; employment: number; experience: number };

export default function KycVerificationPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const loc = useLocation();
  const [kyc, setKyc] = useState<any | null>(null);
  const [checks, setChecks] = useState({ id: false, age: false, employment: false, address: false });
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [decisioning, setDecisioning] = useState(false);
  const [minCibilRequired, setMinCibilRequired] = useState<number | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== "verification") {
      nav("/login/staff/verification");
      return;
    }
    const load = async () => {
      setError(null);
      try {
        const data = await getKyc(String(id || ""));
        setKyc(data);
        try {
          const settings = await adminGetSettings();
          if (settings && typeof settings.min_cibil_required === "number") {
            setMinCibilRequired(settings.min_cibil_required);
          }
        } catch (e) {
          // don't block KYC load on settings failure
          console.warn("Failed to load admin settings", e);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to load KYC"));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id, nav]);

  const savedScoresStr = localStorage.getItem(`kyc_scores_${id}`);
  const saved: Scores | null = savedScoresStr ? (JSON.parse(savedScoresStr) as Scores) : null;

  const breakdown = useMemo(() => {
    const incomeScore = saved?.income ?? (checks.employment ? 25 : 0);
    const obligationScore = saved?.emi ?? (checks.id ? 25 : 0);
    const employmentScore = saved?.employment ?? (checks.employment ? 25 : 0);
    const experienceScore = saved?.experience ?? (checks.address ? 25 : 0);
    const total = incomeScore + obligationScore + employmentScore + experienceScore;
    return { incomeScore, obligationScore, employmentScore, experienceScore, total };
  }, [checks, savedScoresStr]);

  const savedObj: any = savedScoresStr ? JSON.parse(savedScoresStr) : null;
  const cibil = savedObj?.cibil ?? Math.max(300, Math.min(900, 300 + Math.round(breakdown.total * 6)));

  const formatMoney = (value?: number) =>
    typeof value === "number" ? `INR ${value.toLocaleString("en-IN")}` : "-";
  const fullName = kyc?.full_name ?? kyc?.name ?? kyc?.fullName ?? "-";
  const phoneNumber = kyc?.phone_number ?? kyc?.phone ?? kyc?.phoneNumber ?? "-";
  const employmentStatus =
    kyc?.employment_status ?? kyc?.employment ?? kyc?.employmentStatus ?? "-";
  const monthlyIncomeRaw =
    typeof kyc?.monthly_income === "number"
      ? kyc.monthly_income
      : typeof kyc?.monthlyIncome === "number"
        ? kyc.monthlyIncome
        : undefined;

  const kycStatusRaw = String(kyc?.kyc_status || "pending").toLowerCase().trim();
  const kycStatusLabel = kycStatusRaw
    ? kycStatusRaw
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : "Pending";

  const readonlyFromQuery = useMemo(() => {
    try {
      const q = new URLSearchParams(loc.search);
      return q.get("readonly") === "1";
    } catch {
      return false;
    }
  }, [loc.search]);

  const isFinalDecision = kycStatusRaw === "approved" || kycStatusRaw === "rejected";
  const readOnly = readonlyFromQuery || isFinalDecision;

  const baseChecksOk = checks.id && checks.age && checks.employment && checks.address;
  const belowCibil = minCibilRequired !== null && cibil < (minCibilRequired ?? 0);
  const approveDisabled = !baseChecksOk || belowCibil;
  const checklistItems = [
    { key: "id", label: "ID consistency", hint: "PAN and Aadhaar details match" },
    { key: "age", label: "Age and nationality eligibility", hint: "Meets product criteria" },
    { key: "employment", label: "Employment and income credibility", hint: "Stable income proof" },
    { key: "address", label: "Address verification", hint: "Proof of address confirmed" },
  ] as const;
  const completedCount = Object.values(checks).filter(Boolean).length;
  const completionPercent = Math.round((completedCount / checklistItems.length) * 100);

  const updateDecision = async (decision: "approved" | "rejected") => {
    if (readOnly) return;
    setError(null);
    setDecisioning(true);
    try {
      await verifyKyc(String(id || ""), {
        approve: decision === "approved",
        employment_score: breakdown.employmentScore,
        income_score: breakdown.incomeScore,
        emi_score: breakdown.obligationScore,
        experience_score: breakdown.experienceScore,
        total_score: breakdown.total,
        cibil_score: cibil,
        remarks: remarks || undefined,
      });
      nav("/verification");
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to update KYC decision"));
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
    if (!res.ok) {
      throw new Error("Failed to download document");
    }
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  };

  const handleOpenDoc = async (url: string) => {
    try {
      const blobUrl = await fetchDocBlobUrl(url);
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to open document"));
    }
  };

  const handleDownloadDoc = async (url: string, filename: string) => {
    try {
      const blobUrl = await fetchDocBlobUrl(url);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to download document"));
    }
  };

  if (loading) {
    return (
      <div className="verification-page">
        <div className="verification-container">
          <DataState variant="loading" title="Loading KYC record" message="Fetching applicant details securely." />
        </div>
      </div>
    );
  }

  if (!kyc) {
    return (
      <div className="verification-page">
        <div className="verification-container">
          <DataState
            variant="empty"
            title="KYC record not found"
            message="This record may have been reassigned or removed from your queue."
            ctaLabel="Back to Queue"
            onCta={() => nav("/verification")}
          />
        </div>
      </div>
    );
  }

  const panUrl = kyc?.pan_card ? downloadKycDocumentUrl(String(id || ""), "pan_card") : "";
  const aadhaarUrl = kyc?.aadhar_card ? downloadKycDocumentUrl(String(id || ""), "aadhar_card") : "";

  const logoUrl = new URL("../../../styles/paycrest-logo.png", import.meta.url).href;

  return (
    <div className="verification-page">
      <div className="verification-container">
        <div className="vstack">
          <div className="verification-hero verification-hero--compact">
            <div className="hero-main">
              <div className="brand">
                <img src={logoUrl} alt="PayCrest" className="brand-logo" />
                <div>
                  <div className="brand-title">PayCrest</div>
                  <div className="brand-sub">KYC Review</div>
                </div>
              </div>
              <div className="hero-title">KYC Verification</div>
              <div className="hero-sub">Customer ID {id || "-"}</div>
            </div>
            <div className="hero-actions">
              <BackButton className="btn back" fallback="/verification" />
            </div>
          </div>

          {readOnly ? (
            <div className="card" style={{ padding: 14 }}>
              <div className="muted">
                This KYC already has a decision (<strong style={{ color: "var(--text-primary)" }}>{kycStatusLabel}</strong>). Actions are disabled to avoid conflicts.
              </div>
            </div>
          ) : null}

          {error ? (
            <DataState
              variant="error"
              title="Action failed"
              message={String(error)}
              ctaLabel="Retry"
              onCta={() => setError(null)}
            />
          ) : null}

          <div className="card kyc-summary-card">
            <div className="kyc-summary-head">
              <div>
                <div className="kyc-summary-title">Applicant Overview</div>
                <div className="muted">Key identifiers and eligibility snapshot.</div>
              </div>
              <div className={`kyc-status-pill status-${kycStatusRaw || "pending"}`}>
                {kycStatusLabel}
              </div>
            </div>

            <div className="kyc-summary-grid">
              <div className="kyc-summary-item">
                <span>Customer ID</span>
                <strong>{kyc.customer_id || id || "-"}</strong>
              </div>
              <div className="kyc-summary-item">
                <span>Full Name</span>
                <strong>{fullName}</strong>
              </div>
              <div className="kyc-summary-item">
                <span>Phone</span>
                <strong>{phoneNumber}</strong>
              </div>
              <div className="kyc-summary-item">
                <span>DOB</span>
                <strong>{kyc.dob ? String(kyc.dob) : "-"}</strong>
              </div>
              <div className="kyc-summary-item">
                <span>Employment</span>
                <strong>{employmentStatus}</strong>
              </div>
              <div className="kyc-summary-item">
                <span>Monthly Income</span>
                <strong>{formatMoney(monthlyIncomeRaw)}</strong>
              </div>
              <div className="kyc-summary-item">
                <span>PAN</span>
                <strong>{String(kyc?.pan_number || kyc?.pan_masked || "-")}</strong>
              </div>
              <div className="kyc-summary-item">
                <span>Aadhaar</span>
                <strong>{String(kyc?.aadhaar_number || kyc?.aadhar_number || kyc?.aadhaar_masked || "-")}</strong>
              </div>
            </div>

            <div className="kyc-score-row">
              <div className="muted">
                Internal credit score derived from checklist and scoring.
              </div>
              <div className="kyc-score-meta" style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
                <div>
                  Total Score: <strong>{kyc.total_score ?? breakdown.total ?? "-"}</strong>
                </div>
                <button
                  type="button"
                  className="btn compact kyc-open-scoring-btn"
                  onClick={() => nav(`/verification/score/kyc/${encodeURIComponent(id || "")}`)}
                >
                  Open Scoring
                </button>
              </div>
            </div>
          </div>

          <div className="card kyc-docs-card">
            <h4>KYC Documents</h4>
            {!panUrl && !aadhaarUrl ? (
              <div className="muted">No KYC documents attached in the customer submission.</div>
            ) : (
              <div className="kyc-docs-list">
                {panUrl && (
                  <div className="kyc-doc-row">
                    <div className="kyc-doc-label">PAN</div>
                    <div className="kyc-doc-actions">
                      <button type="button" className="btn compact" onClick={() => handleOpenDoc(panUrl)}>
                        Open PAN
                      </button>
                      <button type="button" className="btn ghost compact" onClick={() => handleDownloadDoc(panUrl, `PAN_${id}.pdf`)}>
                        Download
                      </button>
                    </div>
                  </div>
                )}
                {aadhaarUrl && (
                  <div className="kyc-doc-row">
                    <div className="kyc-doc-label">Aadhaar</div>
                    <div className="kyc-doc-actions">
                      <button type="button" className="btn compact" onClick={() => handleOpenDoc(aadhaarUrl)}>
                        Open Aadhaar
                      </button>
                      <button type="button" className="btn ghost compact" onClick={() => handleDownloadDoc(aadhaarUrl, `AADHAAR_${id}.pdf`)}>
                        Download
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="card kyc-checklist-card">
            <div className="checklist-head">
              <div>
                <h4>Verification Checklist</h4>
                <p className="muted">Complete all checks before approval.</p>
              </div>
              <div className="checklist-progress">
                <span>{completedCount}/{checklistItems.length} done</span>
                <div className="progress-bar">
                  <span style={{ width: `${completionPercent}%` }} />
                </div>
              </div>
            </div>

            <div className="checklist-grid">
              <div className="checklist-items">
                {checklistItems.map((item) => (
                  <label key={item.key} className={`check-item ${checks[item.key] ? "checked" : ""}`}>
                    <input
                      type="checkbox"
                      checked={checks[item.key]}
                      disabled={readOnly}
                      onChange={(e) => setChecks((s) => ({ ...s, [item.key]: e.target.checked }))}
                    />
                    <span className="check-content">
                      <strong>{item.label}</strong>
                      <span className="muted">{item.hint}</span>
                    </span>
                  </label>
                ))}
              </div>

              <div className="score-panel">
                <div className="score-title">Scores (0-25 each)</div>
                <div className="score-row"><span>Income</span><strong>{breakdown.incomeScore}</strong></div>
                <div className="score-row"><span>EMI burden</span><strong>{breakdown.obligationScore}</strong></div>
                <div className="score-row"><span>Employment</span><strong>{breakdown.employmentScore}</strong></div>
                <div className="score-row"><span>Experience</span><strong>{breakdown.experienceScore}</strong></div>
                <div className="score-total">
                  <span>Total</span>
                  <strong>{breakdown.total}</strong>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Remarks (optional)</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add remarks for audit trail"
                maxLength={300}
                rows={3}
                disabled={readOnly}
              />
            </div>

            <div className="checklist-actions">
              <button className="btn ghost" disabled={readOnly || decisioning} onClick={() => updateDecision("rejected")}>
                Reject KYC
              </button>
              <button className="btn" disabled={readOnly || decisioning || approveDisabled} onClick={() => updateDecision("approved")}>
                Approve KYC
              </button>
            </div>
            {belowCibil && (
              <div style={{ marginTop: 8 }} className="muted">
                Approve disabled: Computed CIBIL <strong>{cibil}</strong> is below required minimum <strong>{minCibilRequired}</strong>.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}




