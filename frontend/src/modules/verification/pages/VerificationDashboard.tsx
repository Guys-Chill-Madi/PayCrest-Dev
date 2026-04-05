import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BarChart from "../../../components/charts/BarChart";
import LineChart from "../../../components/charts/LineChart";
import PieChart from "../../../components/charts/PieChart";
import DataState from "../../../components/ui/DataState";
import { getMyProfile } from "../../../lib/api/auth";
import { getSession, verificationDashboard } from '../../../modules/verification/services/verificationApi';
import "../../../styles/verification.css";
import { formatISTDate, formatISTDateTime, formatISTTime } from "../../../lib/datetime";

type KycRow = {
  customer_id: string | number;
  full_name?: string;
  phone_number?: string;
  monthly_income?: number;
  dob?: string | number;
  submitted_at?: string | number;
  verified_at?: string | number;
  kyc_status?: string;
  email?: string;
};

type LoanRow = {
  loan_id: number;
  customer_id?: string | number;
  full_name?: string;
  loan_amount?: number;
  tenure_months?: number;
  applied_at?: string | number;
  verification_completed_at?: string | number;
  status?: string;
  vehicle_type?: string;
  vehicle_model?: string;
  vehicle_price_doc?: string;
};

const getLoanCollection = (loan: LoanRow) => {
  const explicit = (loan as any)?.loan_collection;
  if (explicit) return String(explicit);
  if (loan.vehicle_type || loan.vehicle_model || loan.vehicle_price_doc) return "vehicle_loans";
  if ((loan as any)?.property_type || (loan as any)?.home_property_doc) return "home_loans";
  if ((loan as any)?.college_details || (loan as any)?.course_details || (loan as any)?.fees_structure) return "education_loans";
  return "personal_loans";
};

export default function VerificationDashboard() {
  const [kyc, setKyc] = useState<KycRow[]>([]);
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [processedKyc, setProcessedKyc] = useState<KycRow[]>([]);
  const [processedLoans, setProcessedLoans] = useState<LoanRow[]>([]);
  const [activeTab, setActiveTab] = useState<"kyc" | "docs">("kyc");
  const [completedKycPage, setCompletedKycPage] = useState(1);
  const [last, setLast] = useState<number | null>(null);
  const [error, setError] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [accountName, setAccountName] = useState<string | null>(null);
  const nav = useNavigate();
  const loc = useLocation();
  const session = getSession();
  const displayName = useMemo(() => {
    const raw = String(accountName || session?.userId || localStorage.getItem("currentStaffEmail") || "Verification");
    const base = raw.includes("@") ? raw.split("@")[0] : raw;
    const cleaned = base.replace(/[._-]+/g, " ").trim();
    if (!cleaned) return "Verification";
    if (/^\d+$/.test(cleaned)) return "Verification";
    return cleaned
      .split(" ")
      .filter(Boolean)
      .map((p) => p.slice(0, 1).toUpperCase() + p.slice(1))
      .join(" ");
  }, [accountName, session?.userId]);

  const queueView: "pending" | "completed" = useMemo(() => {
    if (loc.pathname === "/verification/completed") return "completed";
    return "pending";
  }, [loc.pathname]);
  const isDashboardView = loc.pathname === "/verification";
  const heroTitle = isDashboardView ? `Hi, ${displayName}!` : queueView === "pending" ? "Pending" : "Completed";
  const heroSubtitle = isDashboardView
    ? "Verify smart. Decide fast. Keep the queue moving."
    : queueView === "pending"
      ? "KYC and document cases waiting for your review."
      : "Recently processed KYC and document decisions.";

  const toTs = (value?: string | number) => {
    if (!value) return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
    const d = new Date(value);
    const t = d.getTime();
    return Number.isNaN(t) ? 0 : t;
  };

  const formatDateTime = (value?: string | number) => {
    return formatISTDateTime(value as any, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAge = (dob?: string | number) => {
    if (!dob) return "--";
    const d = typeof dob === "string" ? new Date(dob) : new Date(dob);
    if (Number.isNaN(d.getTime())) return "--";
    const now = new Date();
    let years = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) {
      years--;
    }
    return `${years}y`;
  };

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await verificationDashboard();
      setKyc(Array.isArray(data.pending_kyc) ? data.pending_kyc : []);
      // Backend returns personal and vehicle pending lists separately — combine them for the UI
      const personal = Array.isArray((data as any).pending_personal_loans) ? (data as any).pending_personal_loans : [];
      const vehicle = Array.isArray((data as any).pending_vehicle_loans) ? (data as any).pending_vehicle_loans : [];
      const education = Array.isArray((data as any).pending_education_loans) ? (data as any).pending_education_loans : [];
      const home = Array.isArray((data as any).pending_home_loans) ? (data as any).pending_home_loans : [];
      setLoans([...personal, ...vehicle, ...education, ...home]);
      setProcessedKyc(Array.isArray((data as any).processed_kyc) ? (data as any).processed_kyc : []);
      // processed loan lists may not be provided by backend; prefer provided key or empty
      const procLoans = Array.isArray((data as any).processed_loan_verifications)
        ? (data as any).processed_loan_verifications
        : Array.isArray((data as any).processed_personal_loans)
        ? (data as any).processed_personal_loans
        : [];
      setProcessedLoans(procLoans);
      setLast(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load verification dashboard"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== "verification") {
      nav("/login/staff/verification");
      return;
    }
    void refresh();
    void (async () => {
      try {
        const me = await getMyProfile();
        if (me?.full_name && String(me.full_name).trim()) {
          setAccountName(String(me.full_name).trim());
        }
      } catch {
        // Keep fallback display name if profile fetch fails.
      }
    })();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible" || loading) return;
      void refresh();
    }, 15000);
    return () => window.clearInterval(timer);
  }, [loading]);

  const kycRows = [...(queueView === "pending" ? kyc : processedKyc)].sort((a, b) => {
    const aTs = queueView === "pending" ? toTs(a.submitted_at) : toTs(a.verified_at || a.submitted_at);
    const bTs = queueView === "pending" ? toTs(b.submitted_at) : toTs(b.verified_at || b.submitted_at);
    return bTs - aTs;
  });
  const loanRows = [...(queueView === "pending" ? loans : processedLoans)].sort((a, b) => {
    const aTs = queueView === "pending" ? toTs(a.applied_at) : toTs(a.verification_completed_at || a.applied_at);
    const bTs = queueView === "pending" ? toTs(b.applied_at) : toTs(b.verification_completed_at || b.applied_at);
    return bTs - aTs;
  });

  const isWithinLast24h = (value?: string | number) => {
    if (!value) return false;
    const ts = typeof value === "string" ? Number(new Date(value)) : value;
    if (!ts || Number.isNaN(ts)) return false;
    return Date.now() - ts < 86400000;
  };

  const normalizeLoanStatus = (value?: string) => String(value || "").toLowerCase().trim();

  const loanStatusPill = (value?: string) => {
    const status = normalizeLoanStatus(value);
    if (status === "assigned_to_verification") return { cls: "pending", label: "Pending" };
    if (status === "verification_done") return { cls: "approved", label: "Verification Done" };
    if (status === "manager_approved") return { cls: "approved", label: "Manager Approved" };
    if (status === "pending_admin_approval") return { cls: "pending", label: "Admin Review" };
    if (status === "admin_approved") return { cls: "approved", label: "Admin Approved" };
    if (status === "sanction_sent") return { cls: "pending", label: "Sanction Sent" };
    if (status === "signed_received") return { cls: "pending", label: "Signed Received" };
    if (status === "ready_for_disbursement") return { cls: "approved", label: "Ready for Disbursement" };
    if (status === "disbursed") return { cls: "approved", label: "Disbursed" };
    if (status === "rejected" || status === "manager_rejected" || status === "admin_rejected")
      return { cls: "rejected", label: status === "rejected" ? "Rejected" : status === "manager_rejected" ? "Manager Rejected" : "Admin Rejected" };
    if (status) return { cls: "info", label: status.replace(/_/g, " ") };
    return { cls: "info", label: "--" };
  };

  const kycStatusPill = (value?: string) => {
    const status = String(value || "").toLowerCase().trim();
    if (status === "pending") return { cls: "pending", label: "Pending" };
    if (status === "approved") return { cls: "approved", label: "Approved" };
    if (status === "rejected") return { cls: "rejected", label: "Rejected" };
    if (status) return { cls: "info", label: status };
    return { cls: "info", label: "--" };
  };

  const kycAnalytics = useMemo(() => {
    const rows = queueView === "pending" ? kyc : processedKyc;
    const income = { "<25k": 0, "25-50k": 0, "50-100k": 0, ">100k": 0 };

    rows.forEach((r) => {
      const n = typeof r.monthly_income === "number" ? r.monthly_income : Number(r.monthly_income);
      if (!Number.isFinite(n) || n <= 0) return;
      if (n < 25000) income["<25k"] += 1;
      else if (n < 50000) income["25-50k"] += 1;
      else if (n < 100000) income["50-100k"] += 1;
      else income[">100k"] += 1;
    });

    const incomeBands = [
      { label: "<25k", value: income["<25k"], color: "#60a5fa" },
      { label: "25-50k", value: income["25-50k"], color: "#3b82f6" },
      { label: "50-100k", value: income["50-100k"], color: "#2563eb" },
      { label: ">100k", value: income[">100k"], color: "#1d4ed8" },
    ];

    if (queueView === "completed") {
      const counts = rows.reduce(
        (acc, r) => {
          const s = String(r.kyc_status || "").toLowerCase().trim();
          if (s === "approved") acc.approved += 1;
          else if (s === "rejected") acc.rejected += 1;
          else acc.other += 1;
          return acc;
        },
        { approved: 0, rejected: 0, other: 0 },
      );
      const pie = [
        { label: "Approved", value: counts.approved, color: "#22c55e" },
        { label: "Rejected", value: counts.rejected, color: "#ef4444" },
        { label: "Other", value: counts.other, color: "#60a5fa" },
      ];
      return { incomeBands, pie, pieTitle: "KYC Decisions", pieHint: "Approved vs rejected (completed queue)." };
    }

    const now = Date.now();
    const aging = rows.reduce(
      (acc, r) => {
        const ts = toTs(r.submitted_at);
        if (!ts) return acc;
        const age = now - ts;
        if (age < 24 * 60 * 60 * 1000) acc.fresh += 1;
        else if (age < 3 * 24 * 60 * 60 * 1000) acc.mid += 1;
        else acc.old += 1;
        return acc;
      },
      { fresh: 0, mid: 0, old: 0 },
    );

    const pie = [
      { label: "<24h", value: aging.fresh, color: "#22c55e" },
      { label: "1-3d", value: aging.mid, color: "#f59e0b" },
      { label: ">3d", value: aging.old, color: "#ef4444" },
    ];

    return { incomeBands, pie, pieTitle: "KYC Aging", pieHint: "How long KYC has been waiting (pending queue)." };
  }, [kyc, processedKyc, queueView]);

  const loanAnalytics = useMemo(() => {
    const rows = queueView === "pending" ? loans : processedLoans;
    const counts = rows.reduce(
      (acc, r) => {
        const c = getLoanCollection(r);
        if (c === "vehicle_loans") acc.vehicle += 1;
        else if (c === "home_loans") acc.home += 1;
        else if (c === "education_loans") acc.education += 1;
        else acc.personal += 1;
        return acc;
      },
      { personal: 0, vehicle: 0, home: 0, education: 0 },
    );

    const byType = [
      { label: "Personal", value: counts.personal, color: "#3b82f6" },
      { label: "Vehicle", value: counts.vehicle, color: "#f59e0b" },
      { label: "Home", value: counts.home, color: "#06b6d4" },
      { label: "Education", value: counts.education, color: "#8b5cf6" },
    ];

    if (queueView === "completed") {
      const bucket = rows.reduce(
        (acc, r) => {
          const s = normalizeLoanStatus(r.status);
          if (["rejected", "manager_rejected", "admin_rejected", "foreclosed"].includes(s)) acc.rejected += 1;
          else if (
            [
              "verification_done",
              "manager_approved",
              "pending_admin_approval",
              "admin_approved",
              "sanction_sent",
              "signed_received",
              "ready_for_disbursement",
              "disbursed",
              "active",
              "completed",
            ].includes(s)
          )
            acc.approved += 1;
          else acc.other += 1;
          return acc;
        },
        { approved: 0, rejected: 0, other: 0 },
      );

      const pie = [
        { label: "Approved/Forwarded", value: bucket.approved, color: "#22c55e" },
        { label: "Rejected", value: bucket.rejected, color: "#ef4444" },
        { label: "Other", value: bucket.other, color: "#60a5fa" },
      ];
      return { byType, pie, pieTitle: "Document Outcomes", pieHint: "Results from completed document reviews." };
    }

    const now = Date.now();
    const aging = rows.reduce(
      (acc, r) => {
        const ts = toTs(r.applied_at);
        if (!ts) return acc;
        const age = now - ts;
        if (age < 24 * 60 * 60 * 1000) acc.fresh += 1;
        else if (age < 3 * 24 * 60 * 60 * 1000) acc.mid += 1;
        else acc.old += 1;
        return acc;
      },
      { fresh: 0, mid: 0, old: 0 },
    );

    const pie = [
      { label: "<24h", value: aging.fresh, color: "#22c55e" },
      { label: "1-3d", value: aging.mid, color: "#f59e0b" },
      { label: ">3d", value: aging.old, color: "#ef4444" },
    ];

    return { byType, pie, pieTitle: "Document Aging", pieHint: "How long loans have been waiting (pending queue)." };
  }, [loans, processedLoans, queueView]);

  const trends = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = formatISTDate(d, { month: "short" });
      return { key, label };
    });
    const monthSet = new Set(months.map((m) => m.key));

    const toMonthKey = (value?: string | number) => {
      const ts = toTs(value);
      if (!ts) return null;
      const d = new Date(ts);
      if (Number.isNaN(d.getTime())) return null;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return monthSet.has(key) ? key : null;
    };

    const bump = (map: Map<string, number>, key: string | null) => {
      if (!key) return;
      map.set(key, (map.get(key) || 0) + 1);
    };

    const kycSubmitted = new Map<string, number>();
    const kycDecided = new Map<string, number>();
    const loanSubmitted = new Map<string, number>();
    const loanDecided = new Map<string, number>();

    kyc.forEach((r) => bump(kycSubmitted, toMonthKey(r.submitted_at)));
    processedKyc.forEach((r) => bump(kycDecided, toMonthKey(r.verified_at || r.submitted_at)));
    loans.forEach((r) => bump(loanSubmitted, toMonthKey(r.applied_at)));
    processedLoans.forEach((r) => bump(loanDecided, toMonthKey(r.verification_completed_at || r.applied_at)));

    return { months, kycSubmitted, kycDecided, loanSubmitted, loanDecided };
  }, [kyc, loans, processedKyc, processedLoans]);

  const kycSubmittedSeries = trends.months.map((m) => ({ label: m.label, value: trends.kycSubmitted.get(m.key) || 0 }));
  const kycDecidedSeries = trends.months.map((m) => ({ label: m.label, value: trends.kycDecided.get(m.key) || 0 }));
  const loanSubmittedSeries = trends.months.map((m) => ({ label: m.label, value: trends.loanSubmitted.get(m.key) || 0 }));
  const loanDecidedSeries = trends.months.map((m) => ({ label: m.label, value: trends.loanDecided.get(m.key) || 0 }));

  const hasKycSubmittedTrend = kycSubmittedSeries.some((d) => d.value > 0);
  const hasKycDecidedTrend = kycDecidedSeries.some((d) => d.value > 0);
  const hasLoanSubmittedTrend = loanSubmittedSeries.some((d) => d.value > 0);
  const hasLoanDecidedTrend = loanDecidedSeries.some((d) => d.value > 0);

  const completedKycPageSize = 10;
  const completedKycTotalPages = Math.max(1, Math.ceil(kycRows.length / completedKycPageSize));
  const completedKycStart = (completedKycPage - 1) * completedKycPageSize;
  const visibleKycRows =
    queueView === "completed"
      ? kycRows.slice(completedKycStart, completedKycStart + completedKycPageSize)
      : kycRows;

  useEffect(() => {
    setCompletedKycPage(1);
  }, [queueView, activeTab]);

  useEffect(() => {
    if (queueView !== "completed") return;
    if (completedKycPage > completedKycTotalPages) {
      setCompletedKycPage(completedKycTotalPages);
    }
  }, [queueView, completedKycPage, completedKycTotalPages]);

  return (
    <div className="verification-page">
      <div className="verification-container">
        <div className="vstack">
          <div className="verification-hero">
            <div className="hero-main">
              <div className="hero-title">{heroTitle}</div>
              <div className="hero-sub">{heroSubtitle}</div>
            </div>
            <div className="hero-actions">
              {last ? <span className="muted">Updated {formatISTTime(last)}</span> : null}
              <button className="btn primary" onClick={refresh} disabled={loading}>
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          {error ? (
            <DataState
              variant="error"
              title="Unable to load verification data"
              message={String(error)}
              ctaLabel="Retry"
              onCta={() => {
                void refresh();
              }}
            />
          ) : null}

          {loading ? (
            <div className="verification-skeleton-grid" aria-hidden="true">
              <div className="ds-skeleton verification-skeleton-card"></div>
              <div className="ds-skeleton verification-skeleton-card"></div>
            </div>
          ) : null}

          <div className="card" style={{ padding: 14 }}>
            <div className="hstack" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div className="tab-bar" role="tablist" aria-label="Verification queue tabs">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "kyc"}
                  className={`tab-button ${activeTab === "kyc" ? "active" : ""}`}
                  onClick={() => setActiveTab("kyc")}
                >
                  KYC Queue
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "docs"}
                  className={`tab-button ${activeTab === "docs" ? "active" : ""}`}
                  onClick={() => setActiveTab("docs")}
                >
                  Document Queue
                </button>
              </div>

            </div>
          </div>

          <div className="summary-cards summary-cards--wide">
            <div className="summary-card">
              <span className="summary-label">{queueView === "pending" ? "Pending KYC" : "Completed KYC"}</span>
              <span className="summary-value">{kycRows.length}</span>
              <span className="summary-sub">{queueView === "pending" ? "Awaiting verification" : "Decided (last 30 days)"}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">{queueView === "pending" ? "Submitted Today" : "Completed Today"}</span>
              <span className="summary-value">
                {queueView === "pending"
                  ? kyc.filter(k => isWithinLast24h(k.submitted_at)).length
                  : processedKyc.filter(k => isWithinLast24h(k.verified_at)).length}
              </span>
              <span className="summary-sub">Last 24 hours</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">{queueView === "pending" ? "Pending Docs" : "Completed Docs"}</span>
              <span className="summary-value">{loanRows.length}</span>
              <span className="summary-sub">{queueView === "pending" ? "Ready for review" : "Processed (last 30 days)"}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">{queueView === "pending" ? "Total Pending" : "Total Completed"}</span>
              <span className="summary-value">{kycRows.length + loanRows.length}</span>
              <span className="summary-sub">KYC + Document queues</span>
            </div>
          </div>

          {activeTab === "kyc" ? (
            <>
              <div className="analytics-grid">
                <div className="card analytics-card">
                  <div className="analytics-head">
                    <div>
                      <h3>KYC by Income Band</h3>
                      <p className="muted">Distribution using monthly income (where available).</p>
                    </div>
                  </div>
                  <BarChart data={kycAnalytics.incomeBands} ariaLabel="KYC by income band bar chart" valueFormatter={(v) => String(v)} />
                </div>

                <div className="card analytics-card">
                  <div className="analytics-head">
                    <div>
                      <h3>{kycAnalytics.pieTitle}</h3>
                      <p className="muted">{kycAnalytics.pieHint}</p>
                    </div>
                  </div>
                  <div className="pie-stack">
                    <PieChart data={kycAnalytics.pie} ariaLabel="KYC distribution pie chart" />
                    <div className="pie-legend" aria-label="KYC legend">
                      {kycAnalytics.pie.map((d) => (
                        <div key={d.label} className="pie-legend-item">
                          <span className="legend-swatch" style={{ background: d.color }} aria-hidden="true" />
                          <span>{d.label}</span>
                          <strong style={{ marginLeft: "auto", color: "var(--text-primary)" }}>{d.value}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {hasKycSubmittedTrend || hasKycDecidedTrend ? (
                <div className="analytics-grid" style={(hasKycSubmittedTrend ? 1 : 0) + (hasKycDecidedTrend ? 1 : 0) === 1 ? { gridTemplateColumns: "1fr" } : undefined}>
                  {hasKycSubmittedTrend ? (
                    <div key="kyc-submitted" className="card analytics-card">
                      <div className="analytics-head">
                        <div>
                          <h3>KYC Submissions Trend</h3>
                          <p className="muted">Last 6 months (from submitted timestamps).</p>
                        </div>
                      </div>
                      <LineChart
                        data={kycSubmittedSeries}
                        ariaLabel="KYC submissions trend line chart"
                        stroke="#2563eb"
                        fill="rgba(37, 99, 235, 0.12)"
                      />
                    </div>
                  ) : null}

                  {hasKycDecidedTrend ? (
                    <div key="kyc-decided" className="card analytics-card">
                      <div className="analytics-head">
                        <div>
                          <h3>KYC Decisions Trend</h3>
                          <p className="muted">Last 6 months (from verified timestamps).</p>
                        </div>
                      </div>
                      <LineChart
                        data={kycDecidedSeries}
                        ariaLabel="KYC decisions trend line chart"
                        stroke="#22c55e"
                        fill="rgba(34, 197, 94, 0.12)"
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div className="analytics-grid">
                <div className="card analytics-card">
                  <div className="analytics-head">
                    <div>
                      <h3>Loans by Type</h3>
                      <p className="muted">Distribution across loan products in this queue.</p>
                    </div>
                  </div>
                  <BarChart data={loanAnalytics.byType} ariaLabel="Loan type distribution bar chart" valueFormatter={(v) => String(v)} />
                </div>

                <div className="card analytics-card">
                  <div className="analytics-head">
                    <div>
                      <h3>{loanAnalytics.pieTitle}</h3>
                      <p className="muted">{loanAnalytics.pieHint}</p>
                    </div>
                  </div>
                  <div className="pie-stack">
                    <PieChart data={loanAnalytics.pie} ariaLabel="Loan distribution pie chart" />
                    <div className="pie-legend" aria-label="Loan legend">
                      {loanAnalytics.pie.map((d) => (
                        <div key={d.label} className="pie-legend-item">
                          <span className="legend-swatch" style={{ background: d.color }} aria-hidden="true" />
                          <span>{d.label}</span>
                          <strong style={{ marginLeft: "auto", color: "var(--text-primary)" }}>{d.value}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {hasLoanSubmittedTrend || hasLoanDecidedTrend ? (
                <div className="analytics-grid" style={(hasLoanSubmittedTrend ? 1 : 0) + (hasLoanDecidedTrend ? 1 : 0) === 1 ? { gridTemplateColumns: "1fr" } : undefined}>
                  {hasLoanSubmittedTrend ? (
                    <div key="loan-submitted" className="card analytics-card">
                      <div className="analytics-head">
                        <div>
                          <h3>Loan Applications Trend</h3>
                          <p className="muted">Last 6 months (from applied dates).</p>
                        </div>
                      </div>
                      <LineChart
                        data={loanSubmittedSeries}
                        ariaLabel="Loan applications trend line chart"
                        stroke="#2563eb"
                        fill="rgba(37, 99, 235, 0.12)"
                      />
                    </div>
                  ) : null}

                  {hasLoanDecidedTrend ? (
                    <div key="loan-decided" className="card analytics-card">
                      <div className="analytics-head">
                        <div>
                          <h3>Loan Decisions Trend</h3>
                          <p className="muted">Last 6 months (from verification completed dates).</p>
                        </div>
                      </div>
                      <LineChart
                        data={loanDecidedSeries}
                        ariaLabel="Loan decisions trend line chart"
                        stroke="#22c55e"
                        fill="rgba(34, 197, 94, 0.12)"
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          )}

          {activeTab === "kyc" && !isDashboardView && (
          <div className="card card-table">
            <div className="card-head">
              <div>
                <h3>{queueView === "pending" ? "Pending KYC Verification" : "Completed KYC Decisions"}</h3>
                <p className="muted">
                  {queueView === "pending"
                    ? "Applicants awaiting identity and income verification."
                    : "Recently approved or rejected KYC submissions."}
                </p>
              </div>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Customer ID</th>
                  <th>Applicant</th>
                  <th>Phone</th>
                  <th>{queueView === "pending" ? "Submitted" : "Verified"}</th>
                  <th>Age</th>
                  <th>Status</th>
                  <th>Income</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleKycRows.length ? visibleKycRows.map(k => {
                  const submittedTs = k.submitted_at;
                  const verifiedTs = k.verified_at;
                  const shownTs = queueView === "pending" ? submittedTs : (verifiedTs || submittedTs);
                  const status = kycStatusPill(k.kyc_status || (queueView === "pending" ? "pending" : undefined));
                  return (
                  <tr key={String(k.customer_id)}>
                    <td>{k.customer_id}</td>
                    <td>{k.full_name || "-"}</td>
                    <td>{k.phone_number || "-"}</td>
                    <td>{formatDateTime(shownTs)}</td>
                    <td>{formatAge(k.dob)}</td>
                    <td><span className={`status-pill status-${status.cls}`}>{status.label}</span></td>
                    <td>INR {k.monthly_income ?? "-"}</td>
                    <td>
                      <button
                        className="btn compact"
                        onClick={() =>
                          nav(
                            queueView === "pending"
                              ? `/verification/kyc/${encodeURIComponent(String(k.customer_id))}`
                              : `/verification/kyc/${encodeURIComponent(String(k.customer_id))}?readonly=1`,
                          )
                        }
                      >
                        {queueView === "pending" ? "Verify" : "View"}
                      </button>
                    </td>
                  </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={8}>
                      <DataState
                        variant="empty"
                        title={queueView === "pending" ? "No pending KYC" : "No completed KYC"}
                        message={
                          queueView === "pending"
                            ? "New customer KYC submissions will appear here."
                            : "Completed KYC outcomes from the last 30 days will appear here."
                        }
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {queueView === "completed" && kycRows.length > 0 ? (
              <div
                className="hstack"
                style={{
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderTop: "1px solid var(--border)",
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <span className="muted">
                  Showing {completedKycStart + 1}-{Math.min(completedKycStart + completedKycPageSize, kycRows.length)} of {kycRows.length}
                </span>
                <div className="hstack" style={{ gap: 8 }}>
                  <button
                    type="button"
                    className="btn compact"
                    onClick={() => setCompletedKycPage((p) => Math.max(1, p - 1))}
                    disabled={completedKycPage <= 1}
                  >
                    Prev
                  </button>
                  <span className="muted">Page {completedKycPage} / {completedKycTotalPages}</span>
                  <button
                    type="button"
                    className="btn compact"
                    onClick={() => setCompletedKycPage((p) => Math.min(completedKycTotalPages, p + 1))}
                    disabled={completedKycPage >= completedKycTotalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          )}

          {activeTab === "docs" && !isDashboardView && (
          <div className="card card-table">
            <div className="card-head">
              <div>
                <h3>{queueView === "pending" ? "Pending Document Reviews" : "Completed Document Reviews"}</h3>
                <p className="muted">
                  {queueView === "pending"
                    ? "Applications ready for document validation and decisioning."
                    : "Recently verified or rejected loans."}
                </p>
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
                  <th>{queueView === "pending" ? "Submitted" : "Completed"}</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loanRows.length ? loanRows.map(l => {
                  const collection = getLoanCollection(l);
                  const typeLabel =
                    collection === "vehicle_loans"
                      ? "VEHICLE"
                      : collection === "home_loans"
                        ? "HOME"
                        : collection === "education_loans"
                          ? "EDUCATION"
                          : "PERSONAL";
                  const status = loanStatusPill(l.status || (queueView === "pending" ? "assigned_to_verification" : undefined));
                  const shownTs = queueView === "pending" ? l.applied_at : (l.verification_completed_at || l.applied_at);
                  return (
                    <tr key={`${collection}:${l.loan_id}`}>
                      <td>{`LMS-${String(l.loan_id).padStart(4, "0")}`}</td>
                      <td>{l.customer_id ?? "-"}</td>
                      <td><span className="type-pill">{typeLabel}</span></td>
                      <td>INR {l.loan_amount ?? "-"}</td>
                      <td>{l.tenure_months ?? "-"} M</td>
                      <td>{formatDateTime(shownTs)}</td>
                      <td><span className={`status-pill status-${status.cls}`}>{status.label}</span></td>
                      <td>
                      <button
                        className="btn compact"
                        onClick={() =>
                          nav(
                            queueView === "pending"
                              ? `/verification/loan/${collection}:${l.loan_id}`
                              : `/verification/loan/${collection}:${l.loan_id}?readonly=1`,
                          )
                        }
                      >
                        {queueView === "pending" ? "Review" : "View"}
                      </button>
                    </td>
                  </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={8}>
                      <DataState
                        variant="empty"
                        title={queueView === "pending" ? "No documents pending review" : "No completed document reviews"}
                        message={
                          queueView === "pending"
                            ? "Applications ready for document verification will appear in this queue."
                            : "Completed document reviews from the last 30 days will appear here."
                        }
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}




