import { useEffect, useMemo, useState } from "react";
import { adminAuditExport, adminAuditLogs, getSession } from '../../../modules/admin/services/adminApi';
import "../../../styles/verification.css";
import "../../../styles/audit-tab.css";
import BarChart from "../../../components/charts/BarChart";
import PieChart from "../../../components/charts/PieChart";

type AuditView = "logins" | "transactions" | "loan_events" | "all";

type ServerFilters = {
  action: string;
  actor_id: string;
  entity_id: string;
  date_from: string;
  date_to: string;
  limit: number;
};

function formatTime(iso?: string) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    const date = d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric", timeZone: "Asia/Kolkata" });
    const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Kolkata" });
    return `${date}\n${time}`;
  } catch {
    return "-";
  }
}

function stringifyDetails(details: unknown) {
  try {
    return JSON.stringify(details ?? {});
  } catch {
    return String(details ?? "");
  }
}

function normalizeText(raw: unknown) {
  const text = String(raw ?? "");
  return text
    .replaceAll("â€¢", "•")
    .replaceAll("â€¦", "...")
    .replaceAll("âœ“", "✓")
    .replaceAll("âœ—", "✗");
}

function formatInr(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

type DetailView = {
  amount: string;
  description: string;
  previousBalance: string;
  currentBalance: string;
  status: string;
  meta: Array<{ key: string; value: string }>;
};

function toDetailView(log: any): DetailView {
  const d = (log?.details || {}) as Record<string, unknown>;
  const action = String(log?.action || "").toLowerCase();
  const amountRaw = d.amount ?? d.emi_amount ?? d.total_paid_amount ?? d.penalty_amount;
  const descriptionRaw = d.description ?? d.remarks ?? d.note ?? d.reason;
  const previousBalanceRaw = d.previous_balance ?? d.balance_before;
  const currentBalanceRaw = d.balance_after ?? d.current_balance;
  const successRaw = log?.success;

  const status =
    typeof successRaw === "boolean"
      ? successRaw
        ? "Success"
        : "Failed"
      : action === "login_success"
        ? "Success"
        : action === "login_failure"
          ? "Failed"
          : "-";

  const skip = new Set([
    "amount",
    "emi_amount",
    "total_paid_amount",
    "penalty_amount",
    "description",
    "remarks",
    "note",
    "reason",
    "previous_balance",
    "balance_before",
    "balance_after",
    "current_balance",
    "loan_id",
    "transaction_id",
  ]);

  const meta = Object.entries(d)
    .filter(([k, v]) => !skip.has(k) && v != null && v !== "")
    .slice(0, 4)
    .map(([k, v]) => ({
      key: normalizeText(k.replaceAll("_", " ")),
      value:
        typeof v === "object"
          ? normalizeText(stringifyDetails(v)).slice(0, 80)
          : normalizeText(String(v)).slice(0, 80),
    }));

  return {
    amount: amountRaw != null ? formatInr(amountRaw) : "-",
    description: descriptionRaw != null ? normalizeText(String(descriptionRaw)) : "-",
    previousBalance: previousBalanceRaw != null ? formatInr(previousBalanceRaw) : "-",
    currentBalance: currentBalanceRaw != null ? formatInr(currentBalanceRaw) : "-",
    status,
    meta,
  };
}

function viewMatch(view: AuditView, action?: string) {
  const a = String(action || "").toLowerCase();
  if (view === "all") return true;
  if (view === "logins") return a.startsWith("login_");
  if (view === "transactions") {
    return (
      a.includes("transaction") ||
      a.includes("payment") ||
      a.includes("emi") ||
      a.includes("wallet") ||
      a.includes("credit") ||
      a.includes("debit")
    );
  }
  if (view === "loan_events") {
    return (
      a.includes("loan") ||
      a.includes("apply") ||
      a.includes("approve") ||
      a.includes("reject") ||
      a.includes("sanction") ||
      a.includes("disburse") ||
      a.includes("foreclose") ||
      a.includes("settlement")
    );
  }
  return true;
}

function queryMatch(qRaw: string, l: any) {
  const q = qRaw.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    l?.action,
    l?.actor_role,
    l?.actor_id,
    l?.entity_type,
    l?.entity_id,
    l?.details?.loan_id,
    l?.details?.transaction_id,
    stringifyDetails(l?.details),
  ]
    .filter((v) => v != null)
    .map((v) => String(v).toLowerCase())
    .join(" | ");
  return hay.includes(q);
}

export default function AuditTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState<number | null>(null);
  const [pageSize, setPageSize] = useState(50);

  const [view, setView] = useState<AuditView>("transactions");
  const [query, setQuery] = useState("");
  const [actorRole, setActorRole] = useState("");
  const [entityType, setEntityType] = useState("");

  const [filters, setFilters] = useState<ServerFilters>({
    action: "",
    actor_id: "",
    entity_id: "",
    date_from: "",
    date_to: "",
    limit: 50,
  });

  const load = async (p = 1, nextFilters: ServerFilters = filters) => {
    setLoading(true);
    setError(null);
    try {
      const qs: any = { ...nextFilters, page: p };
      const res = await adminAuditLogs(qs as any);
      const items = (res as any)?.items || [];
      setLogs(items);
      if ((res as any)?.total !== undefined) setTotal((res as any).total as number);
      if ((res as any)?.page_size) setPageSize((res as any).page_size as number);
      setPage(p);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load audit logs"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== "admin") return;
    void load(1, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const actionSet = useMemo(() => {
    const set = new Set<string>();
    for (const l of logs) if (l?.action) set.add(String(l.action));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [logs]);

  const actorRoleSet = useMemo(() => {
    const set = new Set<string>();
    for (const l of logs) if (l?.actor_role) set.add(String(l.actor_role));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [logs]);

  const entityTypeSet = useMemo(() => {
    const set = new Set<string>();
    for (const l of logs) if (l?.entity_type) set.add(String(l.entity_type));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [logs]);

  const visibleLogs = useMemo(() => {
    return logs.filter((l) => {
      if (!viewMatch(view, l?.action)) return false;
      if (actorRole && String(l?.actor_role || "") !== actorRole) return false;
      if (entityType && String(l?.entity_type || "") !== entityType) return false;
      if (!queryMatch(query, l)) return false;
      return true;
    });
  }, [logs, view, actorRole, entityType, query]);

  const summary = useMemo(() => {
    const actorSet = new Set<string>();
    const entitySet = new Set<string>();
    const actionCounts = new Map<string, number>();
    const roleCounts = new Map<string, number>();

    visibleLogs.forEach((l) => {
      if (l?.actor_id != null) actorSet.add(String(l.actor_id));
      if (l?.entity_id != null) entitySet.add(String(l.entity_id));
      const action = String(l?.action || "unknown");
      actionCounts.set(action, (actionCounts.get(action) || 0) + 1);
      const role = String(l?.actor_role || "unknown");
      roleCounts.set(role, (roleCounts.get(role) || 0) + 1);
    });

    const topActions = Array.from(actionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value], i) => ({
        label: label.length > 14 ? `${label.slice(0, 12)}...` : label,
        value,
        color: ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6"][i % 6],
      }));

    const rolesPie = Array.from(roleCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, value], i) => ({
        label,
        value,
        color: ["#2563eb", "#22c55e", "#f59e0b", "#ef4444", "#60a5fa"][i % 5],
      }));

    return {
      actors: actorSet.size,
      entities: entitySet.size,
      topActions,
      rolesPie,
    };
  }, [visibleLogs]);

  const applyPreset = (preset: AuditView) => {
    setView(preset);
    // Avoid stale-state bug: compute next filters and pass into load.
    const next: ServerFilters = { ...filters, action: "" };
    setFilters(next);
    setActorRole("");
    setEntityType("");
    setQuery("");
    void load(1, next);
  };

  const applyFilters = () => void load(1, filters);

  const doExport = async () => {
    try {
      setLoading(true);
      const blob = await adminAuditExport(filters as any);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "audit-logs.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Export failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h3>Audit Logs</h3>
          <p className="muted">View append-only audit records for system actions and transactions.</p>
        </div>
      </div>

      <div
        className="audit-controls"
        onKeyDown={(e) => {
          if (e.key === "Enter") applyFilters();
        }}
      >
        <div className="tab-bar audit-tabs" role="tablist" aria-label="Audit categories">
          <button
            type="button"
            className={`tab-button ${view === "logins" ? "active" : ""}`}
            onClick={() => applyPreset("logins")}
            role="tab"
            aria-selected={view === "logins"}
          >
            Logins
          </button>
          <button
            type="button"
            className={`tab-button ${view === "transactions" ? "active" : ""}`}
            onClick={() => applyPreset("transactions")}
            role="tab"
            aria-selected={view === "transactions"}
          >
            Transactions
          </button>
          <button
            type="button"
            className={`tab-button ${view === "loan_events" ? "active" : ""}`}
            onClick={() => applyPreset("loan_events")}
            role="tab"
            aria-selected={view === "loan_events"}
          >
            Loan Events
          </button>
          <button
            type="button"
            className={`tab-button ${view === "all" ? "active" : ""}`}
            onClick={() => applyPreset("all")}
            role="tab"
            aria-selected={view === "all"}
          >
            All
          </button>
        </div>

        <div className="audit-filters" aria-label="Filters">
          <div className="audit-field">
            <label>Actor ID</label>
            <input
              value={filters.actor_id}
              onChange={(e) => setFilters({ ...filters, actor_id: e.target.value })}
              placeholder="e.g. 19"
            />
          </div>
          <div className="audit-field">
            <label>Loan/Entity ID</label>
            <input
              value={filters.entity_id}
              onChange={(e) => setFilters({ ...filters, entity_id: e.target.value })}
              placeholder="e.g. 15"
            />
          </div>
          <div className="audit-field">
            <label>From</label>
            <input type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} />
          </div>
          <div className="audit-field">
            <label>To</label>
            <input type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} />
          </div>
          <div className="audit-field audit-field--wide">
            <label>Search</label>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search action / ids / details..." />
          </div>
          <div className="audit-field audit-field--span4">
            <label>Action</label>
            <select value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })}>
              <option value="">All actions</option>
              {actionSet.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div className="audit-field audit-field--span4">
            <label>Actor role</label>
            <select value={actorRole} onChange={(e) => setActorRole(e.target.value)}>
              <option value="">All roles</option>
              {actorRoleSet.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="audit-field audit-field--span4">
            <label>Entity type</label>
            <select value={entityType} onChange={(e) => setEntityType(e.target.value)}>
              <option value="">All entities</option>
              {entityTypeSet.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="audit-actions">
          <select
            value={filters.limit}
            onChange={(e) => {
              const next = { ...filters, limit: Number(e.target.value) };
              setFilters(next);
              setPageSize(Number(e.target.value));
              void load(1, next);
            }}
          >
            <option value={25}>25 rows</option>
            <option value={50}>50 rows</option>
            <option value={100}>100 rows</option>
          </select>
          <div className="audit-actions__buttons">
            <button className="btn primary" type="button" onClick={applyFilters} disabled={loading}>
              Apply
            </button>
            <button className="btn" type="button" onClick={() => void load(page, filters)} disabled={loading}>
              Refresh
            </button>
            <button className="btn" type="button" onClick={() => void doExport()} disabled={loading}>
              Export CSV
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 18px 18px" }}>
        <div className="summary-cards summary-cards--wide">
          <div className="summary-card">
            <span className="summary-label">Rows (page)</span>
            <span className="summary-value">{visibleLogs.length}</span>
            <span className="summary-sub">After filters</span>
          </div>
          <div className="summary-card">
            <span className="summary-label">Unique Actors</span>
            <span className="summary-value">{summary.actors}</span>
            <span className="summary-sub">On this page</span>
          </div>
          <div className="summary-card">
            <span className="summary-label">Unique Entities</span>
            <span className="summary-value">{summary.entities}</span>
            <span className="summary-sub">On this page</span>
          </div>
          <div className="summary-card">
            <span className="summary-label">Export</span>
            <span className="summary-value">CSV</span>
            <span className="summary-sub">For compliance</span>
          </div>
        </div>

        <div className="analytics-grid" style={{ marginTop: 14 }}>
          <div className="card analytics-card">
            <div className="analytics-head">
              <div>
                <h3>Top Actions</h3>
                <p className="muted">Most frequent actions in the current view.</p>
              </div>
            </div>
            <BarChart data={summary.topActions} ariaLabel="Top audit actions bar chart" valueFormatter={(v) => String(v)} />
          </div>
          <div className="card analytics-card">
            <div className="analytics-head">
              <div>
                <h3>Actor Roles</h3>
                <p className="muted">Role distribution on this page.</p>
              </div>
            </div>
            <div className="pie-stack">
              <PieChart data={summary.rolesPie} ariaLabel="Actor roles pie chart" />
              <div className="pie-legend" aria-label="Role legend">
                {summary.rolesPie.map((d) => (
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
      </div>

      {error ? (
        <div className="form-message error">{String((error as any)?.humanMessage || (error as any)?.message || error)}</div>
      ) : null}

      <div className="audit-table-wrap">
        <table className="audit-table">
          <thead>
            <tr>
              <th style={{ whiteSpace: "nowrap" }}>Date & Time</th>
              <th>Action</th>
              <th>Actor</th>
              <th>Entity</th>
              <th>Loan</th>
              <th>Txn</th>
              <th>Amount</th>
              <th>Description</th>
              <th>Previous</th>
              <th>Current</th>
              <th>Status</th>
              <th>Meta</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={12}>
                  <div className="muted audit-loading">Loading...</div>
                </td>
              </tr>
            ) : visibleLogs.length ? (
              visibleLogs.map((l) => {
                const detail = toDetailView(l);
                return (
                  <tr key={l._id || `${l.created_at}-${l.actor_id}-${l.action}`}>
                    <td style={{ whiteSpace: "pre-line" }}>{formatTime(l.created_at)}</td>
                    <td>
                      <code className="audit-code">{normalizeText(l.action ?? "-")}</code>
                    </td>
                    <td>
                      <div className="audit-strong">{normalizeText(l.actor_role ?? "-")}</div>
                      <div className="audit-sub">#{normalizeText(l.actor_id ?? "-")}</div>
                    </td>
                    <td>
                      {l.entity_type ? (
                        <div>
                          <div className="audit-strong">{normalizeText(l.entity_type)}</div>
                          <div className="audit-sub">{normalizeText(l.entity_id ?? "-")}</div>
                        </div>
                      ) : (
                        <span className="audit-sub">-</span>
                      )}
                    </td>
                    <td className="audit-link">{normalizeText(l.details?.loan_id ?? "-")}</td>
                    <td className="audit-txn">{normalizeText(l.details?.transaction_id ?? "-")}</td>
                    <td className="audit-money">{detail.amount}</td>
                    <td className="audit-description">{detail.description}</td>
                    <td className="audit-money">{detail.previousBalance}</td>
                    <td className="audit-money">{detail.currentBalance}</td>
                    <td>
                      <span className={`audit-status ${detail.status === "Success" ? "is-success" : detail.status === "Failed" ? "is-failed" : ""}`}>
                        {detail.status}
                      </span>
                    </td>
                    <td>
                      {detail.meta.length ? (
                        <div className="audit-meta">
                          {detail.meta.map((m) => (
                            <div key={`${m.key}:${m.value}`} className="audit-meta-row">
                              <span className="audit-meta-key">{m.key}</span>
                              <span className="audit-meta-value">{m.value}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="audit-sub">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={12}>
                  <div className="empty-state">No audit logs matching filters.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="audit-pager">
        <button className="btn" onClick={() => void load(Math.max(1, page - 1), filters)} disabled={page <= 1 || loading}>
          Prev
        </button>
        {total ? (
          <div className="audit-pages">
            {(() => {
              const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize));
              const start = Math.max(1, page - 3);
              const end = Math.min(totalPages, start + 6);
              const nodes = [] as any[];
              for (let i = start; i <= end; i++) {
                nodes.push(
                  <button
                    key={i}
                    className={`btn ${i === page ? "primary" : ""}`}
                    onClick={() => void load(i, filters)}
                    disabled={loading}
                  >
                    {i}
                  </button>,
                );
              }
              return nodes;
            })()}
          </div>
        ) : null}
        <button
          className="btn"
          onClick={() => void load(page + 1, filters)}
          disabled={loading || (total ? page * pageSize >= (total || 0) : false)}
        >
          Next
        </button>
        {total ? <div className="muted">Page {page} of {Math.max(1, Math.ceil((total || 0) / pageSize))}</div> : null}
        {(query || actorRole || entityType || view !== "all") && !loading ? (
          <div className="muted audit-count">
            Showing {visibleLogs.length} of {logs.length} rows (page)
          </div>
        ) : null}
      </div>
    </div>
  );
}


