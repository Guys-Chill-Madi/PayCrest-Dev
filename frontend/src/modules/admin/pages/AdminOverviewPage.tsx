import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../../styles/verification.css";
import { formatISTTime } from "../../../lib/datetime";
import { getMyProfile } from "../../../lib/api/auth";
import {
  adminApplyEmiPenalty,
  adminApprovalsDashboard,
  adminEmiMonitoring,
  adminListSupportTickets,
  adminPendingApprovals,
  adminProcessEmiDefaults,
  adminResolveSupportTicket,
  getSession,
} from '../../../modules/admin/services/adminApi';
import BarChart from "../../../components/charts/BarChart";
import PieChart from "../../../components/charts/PieChart";
import DataState from "../../../components/ui/DataState";
import { getLoanCollection, normalizeStatus, type LoanRow } from "./adminQueue";
import SupportTicketsTab from "./tabs/SupportTicketsTab";
import type { AdminSupportTicket } from '../../../modules/admin/services/adminApi';

export default function AdminOverviewPage() {
  const nav = useNavigate();
  const [pending, setPending] = useState<LoanRow[]>([]);
  const [processed, setProcessed] = useState<LoanRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [last, setLast] = useState<number | null>(null);
  const [error, setError] = useState<any | null>(null);
  const [emiLoading, setEmiLoading] = useState(false);
  const [emiData, setEmiData] = useState<any | null>(null);
  const [emiActionMsg, setEmiActionMsg] = useState<string | null>(null);
  const [supportTickets, setSupportTickets] = useState<AdminSupportTicket[]>([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportMsg, setSupportMsg] = useState<string | null>(null);
  const [accountName, setAccountName] = useState<string | null>(null);

  const session = getSession();
  const displayName = useMemo(() => {
    const raw = String(accountName || session?.userId || localStorage.getItem("currentStaffEmail") || "Admin");
    const base = raw.includes("@") ? raw.split("@")[0] : raw;
    const cleaned = base.replace(/[._-]+/g, " ").trim();
    if (!cleaned || /^\d+$/.test(cleaned)) return "Admin";
    return cleaned
      .split(" ")
      .filter(Boolean)
      .map((p) => p.slice(0, 1).toUpperCase() + p.slice(1))
      .join(" ");
  }, [accountName, session?.userId]);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApprovalsDashboard(30);
      setPending((data?.pending_approvals || []) as LoanRow[]);
      setProcessed((data?.processed_approvals || []) as LoanRow[]);
      try {
        setEmiLoading(true);
        const monitoring = await adminEmiMonitoring();
        setEmiData(monitoring || null);
      } catch {
        setEmiData(null);
      } finally {
        setEmiLoading(false);
      }
      try {
        setSupportLoading(true);
        const tickets = await adminListSupportTickets({ status: "all" });
        setSupportTickets(Array.isArray(tickets) ? tickets : []);
      } catch {
        setSupportTickets([]);
      } finally {
        setSupportLoading(false);
      }
      setLast(Date.now());
    } catch (err) {
      try {
        const loans = await adminPendingApprovals();
        setPending((loans || []) as LoanRow[]);
        setProcessed([]);
        setLast(Date.now());
        setError(err instanceof Error ? err : new Error("Failed to load approvals dashboard (fallback to pending only)"));
      } catch (fallbackErr) {
        setError(fallbackErr instanceof Error ? fallbackErr : new Error("Failed to load admin data"));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session || session.role !== "admin") {
      nav("/login/staff/admin");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible" || loading || emiLoading || supportLoading) return;
      void refresh();
    }, 15000);
    return () => window.clearInterval(timer);
  }, [loading, emiLoading, supportLoading]);

  const pendingCounts = useMemo(() => {
    const acc = {
      total: pending.length,
      pending_admin_approval: 0,
      manager_approved: 0,
      admin_approved: 0,
      sanction_sent: 0,
      signed_received: 0,
      ready_for_disbursement: 0,
    };
    pending.forEach((l) => {
      const s = normalizeStatus(l.status);
      if (s in acc) (acc as any)[s] += 1;
    });
    return acc;
  }, [pending]);

  const processedCounts = useMemo(() => {
    const acc = { total: processed.length, disbursed: 0, active: 0, completed: 0, rejected: 0, foreclosed: 0, other: 0 };
    processed.forEach((l) => {
      const s = normalizeStatus(l.status);
      if (s === "disbursed") acc.disbursed += 1;
      else if (s === "active") acc.active += 1;
      else if (s === "completed") acc.completed += 1;
      else if (s === "rejected") acc.rejected += 1;
      else if (s === "foreclosed") acc.foreclosed += 1;
      else acc.other += 1;
    });
    return acc;
  }, [processed]);

  const typeCounts = useMemo(() => {
    const acc = { personal: 0, vehicle: 0, home: 0, education: 0 };
    [...pending, ...processed].forEach((l) => {
      const c = getLoanCollection(l);
      if (c === "vehicle_loans") acc.vehicle += 1;
      else if (c === "home_loans") acc.home += 1;
      else if (c === "education_loans") acc.education += 1;
      else acc.personal += 1;
    });
    return acc;
  }, [pending, processed]);

  const barData = [
    { label: "Personal", value: typeCounts.personal, color: "#3b82f6" },
    { label: "Vehicle", value: typeCounts.vehicle, color: "#f59e0b" },
    { label: "Home", value: typeCounts.home, color: "#06b6d4" },
    { label: "Education", value: typeCounts.education, color: "#8b5cf6" },
  ];

  const pieData = [
    { label: "Needs Approval", value: pendingCounts.pending_admin_approval, color: "#2563eb" },
    { label: "Ready for Sanction", value: pendingCounts.admin_approved + pendingCounts.manager_approved, color: "#22c55e" },
    { label: "Sanction Sent", value: pendingCounts.sanction_sent, color: "#f59e0b" },
    { label: "Ready to Disburse", value: pendingCounts.ready_for_disbursement, color: "#06b6d4" },
  ];

  const overdueLoans = useMemo(() => {
    const rows = Array.isArray(emiData?.loans) ? emiData.loans : [];
    return rows.filter((r: any) => Number(r?.overdue_installments || 0) > 0);
  }, [emiData]);

  const applyPenaltyForLoan = async (loan: any) => {
    const first = Array.isArray(loan?.overdue_emis) ? loan.overdue_emis[0] : null;
    if (!first?.emi_id) return;
    const emiAmount = Number(first?.emi_amount || 0);
    const currentPenalty = Number(first?.penalty_amount || 0);
    if (emiAmount <= 0 || currentPenalty > 0) return;
    const penalty = Math.max(1, Math.round(emiAmount * 0.02 * 100) / 100);
    setEmiActionMsg(null);
    try {
      await adminApplyEmiPenalty(String(first.emi_id), penalty, "Admin penalty on overdue EMI");
      setEmiActionMsg(`Penalty INR ${penalty.toFixed(2)} applied for loan ${loan.loan_id}.`);
      const monitoring = await adminEmiMonitoring();
      setEmiData(monitoring || null);
    } catch (err) {
      setEmiActionMsg(err instanceof Error ? err.message : "Failed to apply penalty.");
    }
  };

  const runDefaultWorkflow = async () => {
    setEmiActionMsg(null);
    setEmiLoading(true);
    try {
      const res: any = await adminProcessEmiDefaults({
        grace_days: 3,
        penalty_rate: 0.02,
        freeze_after_missed: 2,
      });
      setEmiActionMsg(
        `Processed ${res?.processed_loans ?? 0}, penalties ${res?.penalties_added ?? 0}, frozen ${res?.frozen_accounts ?? 0}, auto-debits ${res?.auto_debits_success ?? 0}.`,
      );
      const monitoring = await adminEmiMonitoring();
      setEmiData(monitoring || null);
    } catch (err) {
      setEmiActionMsg(err instanceof Error ? err.message : "Failed to process defaults.");
    } finally {
      setEmiLoading(false);
    }
  };

  const resolveSupportTicket = async (ticketId: string, replyMessage: string) => {
    setSupportMsg(null);
    try {
      await adminResolveSupportTicket(ticketId, { reply_message: replyMessage, close_ticket: true });
      setSupportMsg(`Ticket ${ticketId} resolved and closed.`);
      const tickets = await adminListSupportTickets({ status: "all" });
      setSupportTickets(Array.isArray(tickets) ? tickets : []);
    } catch (err) {
      setSupportMsg(err instanceof Error ? err.message : "Failed to resolve support ticket.");
      throw err;
    }
  };

  return (
    <div className="verification-page manager-page">
      <div className="verification-container">
        <div className="vstack">
          <div className="verification-hero">
            <div className="hero-main">
              <div className="hero-title">Hi, {displayName}!</div>
              <div className="hero-sub">Admin overview of approvals, staff, and audit activity.</div>
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
              title="Unable to load admin overview"
              message={String((error as any)?.message || error)}
              ctaLabel="Retry"
              onCta={() => {
                void refresh();
              }}
            />
          ) : null}

          <div className="summary-cards summary-cards--wide">
            <div className="summary-card">
              <span className="summary-label">Pending Queue</span>
              <span className="summary-value">{pendingCounts.total}</span>
              <span className="summary-sub">Items needing action</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Needs Approval</span>
              <span className="summary-value">{pendingCounts.pending_admin_approval}</span>
              <span className="summary-sub">Pending admin decision</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Ready to Disburse</span>
              <span className="summary-value">{pendingCounts.ready_for_disbursement}</span>
              <span className="summary-sub">Signature verified</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Processed (30d)</span>
              <span className="summary-value">{processedCounts.total}</span>
              <span className="summary-sub">Recent activity</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">EMI Defaulters</span>
              <span className="summary-value">{overdueLoans.length}</span>
              <span className="summary-sub">
                Overdue installments: {Number(emiData?.total_overdue_installments || 0)}
              </span>
            </div>
          </div>

          <div className="analytics-grid">
            <div className="card analytics-card">
              <div className="analytics-head">
                <div>
                  <h3>Loans by Type</h3>
                  <p className="muted">Pending + processed approvals.</p>
                </div>
              </div>
              <BarChart data={barData} ariaLabel="Admin approvals by type bar chart" valueFormatter={(v) => String(v)} />
            </div>

            <div className="card analytics-card">
              <div className="analytics-head">
                <div>
                  <h3>Pending Status Split</h3>
                  <p className="muted">Where items are stuck in the pipeline.</p>
                </div>
              </div>
              <div className="pie-stack">
                <PieChart data={pieData} ariaLabel="Pending approvals status pie chart" />
                <div className="pie-legend" aria-label="Status legend">
                  {pieData.map((d) => (
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

          <div className="card" style={{ padding: 16 }}>
            <div className="hstack" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <h3 style={{ margin: 0 }}>EMI Defaulter Field</h3>
                <p className="muted" style={{ marginTop: 6 }}>
                  Admin can apply penalty and run default workflow (reminder, freeze, auto-debit).
                </p>
              </div>
              <button type="button" className="btn primary" onClick={runDefaultWorkflow} disabled={emiLoading}>
                {emiLoading ? "Processing..." : "Run Default Workflow"}
              </button>
            </div>
            {emiActionMsg ? <div className="form-message emi-workflow-message" style={{ marginTop: 10 }}>{emiActionMsg}</div> : null}
            {!overdueLoans.length ? (
              <p className="muted" style={{ marginTop: 12 }}>No overdue EMI loans right now.</p>
            ) : (
              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                {overdueLoans.slice(0, 8).map((loan: any) => {
                  const first = Array.isArray(loan?.overdue_emis) ? loan.overdue_emis[0] : null;
                  const emiAmount = Number(first?.emi_amount || 0);
                  const penalty = Number(first?.penalty_amount || 0);
                  const nextPenalty = Math.max(1, Math.round(emiAmount * 0.02 * 100) / 100);
                  return (
                    <div key={`${loan.loan_collection}-${loan.loan_id}`} className="summary-item" style={{ background: "var(--surface-soft)" }}>
                      <div className="hstack" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <div>
                          <strong>Loan #{loan.loan_id}</strong> Â· Customer {loan.customer_id} Â· {loan.loan_collection}
                          <div className="muted" style={{ marginTop: 4 }}>
                            Overdue: {loan.overdue_installments} Â· Missed streak: {loan.consecutive_missed_emis || 0}
                            {" Â· "}Frozen: {loan.account_frozen ? "Yes" : "No"}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn"
                          disabled={!first?.emi_id || emiAmount <= 0 || penalty > 0}
                          onClick={() => void applyPenaltyForLoan(loan)}
                        >
                          {penalty > 0 ? `Penalty Added (INR ${penalty.toFixed(2)})` : `Add 2% Penalty (INR ${nextPenalty.toFixed(2)})`}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {supportMsg ? <div className="form-message" style={{ marginTop: 10 }}>{supportMsg}</div> : null}
          <SupportTicketsTab
            tickets={supportTickets}
            loading={supportLoading}
            onRefresh={() => {
              void (async () => {
                setSupportLoading(true);
                try {
                  const tickets = await adminListSupportTickets({ status: "all" });
                  setSupportTickets(Array.isArray(tickets) ? tickets : []);
                } finally {
                  setSupportLoading(false);
                }
              })();
            }}
            onResolve={resolveSupportTicket}
          />
        </div>
      </div>
    </div>
  );
}




