import { useMemo, useState } from "react";
import TextPromptModal from "../../../components/TextPromptModal";
import type { AdminSupportTicket } from '../../../modules/admin/services/adminApi';

type Props = {
  tickets: AdminSupportTicket[];
  loading: boolean;
  onRefresh: () => void;
  onResolve: (ticketId: string, replyMessage: string) => Promise<void>;
};

const categoryLabel = (c: AdminSupportTicket["category"]) => {
  if (c === "kyc") return "KYC";
  if (c === "payment") return "Payment";
  if (c === "loan") return "Loan";
  if (c === "wallet") return "Wallet";
  if (c === "documents") return "Documents";
  return "Other";
};

export default function SupportTicketsTab({ tickets, loading, onRefresh, onResolve }: Props) {
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("open");
  const [customerQuery, setCustomerQuery] = useState("");
  const [resolvePrompt, setResolvePrompt] = useState<AdminSupportTicket | null>(null);
  const [resolving, setResolving] = useState(false);

  const filtered = useMemo(() => {
    const rows = Array.isArray(tickets) ? tickets : [];
    const q = customerQuery.trim().toLowerCase();
    return rows.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (!q) return true;
      return (
        String(t.customer_id || "").toLowerCase().includes(q) ||
        String(t.ticket_id || "").toLowerCase().includes(q) ||
        String(t.subject || "").toLowerCase().includes(q)
      );
    });
  }, [tickets, statusFilter, customerQuery]);

  const openCount = useMemo(() => (tickets || []).filter((t) => t.status === "open").length, [tickets]);

  return (
    <>
      <TextPromptModal
        open={!!resolvePrompt}
        title="Reply & Close Ticket"
        description={resolvePrompt ? `Ticket ${resolvePrompt.ticket_id} for customer ${resolvePrompt.customer_id}` : "Reply to customer and close this ticket."}
        label="Resolution Reply"
        placeholder="Explain what was fixed and what customer should do next."
        confirmText="Send Reply & Close"
        confirmVariant="primary"
        busy={resolving}
        onCancel={() => setResolvePrompt(null)}
        onConfirm={async (reply) => {
          if (!resolvePrompt) return;
          const message = String(reply || "").trim();
          if (!message) return;
          setResolving(true);
          try {
            await onResolve(resolvePrompt.ticket_id, message);
            setResolvePrompt(null);
          } finally {
            setResolving(false);
          }
        }}
      />

      <div className="card card-table">
        <div className="card-head">
          <div>
            <h3>Support Tickets</h3>
            <p className="muted">Customer-raised tickets. Reply with resolution and close from admin.</p>
          </div>
          <div className="hstack" style={{ gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <span className="muted">Open: {openCount}</span>
            <input
              value={customerQuery}
              onChange={(e) => setCustomerQuery(e.target.value)}
              placeholder="Search customer/ticket/subject..."
              aria-label="Search support tickets"
            />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} aria-label="Filter support tickets by status">
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="all">All</option>
            </select>
            <button type="button" className="btn" onClick={onRefresh} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Ticket ID</th>
              <th>Customer</th>
              <th>Category</th>
              <th>Issue</th>
              <th>Status</th>
              <th>Admin Reply</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7}>
                  <div className="muted" style={{ textAlign: "center", padding: 20 }}>Loading...</div>
                </td>
              </tr>
            ) : filtered.length ? (
              filtered.map((t) => (
                <tr key={t.ticket_id}>
                  <td>{t.ticket_id}</td>
                  <td>{t.customer_id}</td>
                  <td>{categoryLabel(t.category)}</td>
                  <td>
                    <div style={{ display: "grid", gap: 4 }}>
                      <strong style={{ color: "var(--text-primary)" }}>{t.subject}</strong>
                      <span className="muted" style={{ whiteSpace: "normal" }}>{t.message}</span>
                    </div>
                  </td>
                  <td>{t.status}</td>
                  <td>
                    {t.admin_reply ? (
                      <div style={{ display: "grid", gap: 4 }}>
                        <span>{t.admin_reply}</span>
                        {t.resolved_at ? <span className="muted">{new Date(t.resolved_at).toLocaleString()}</span> : null}
                      </div>
                    ) : (
                      <span className="muted">Pending</span>
                    )}
                  </td>
                  <td>
                    {t.status === "open" ? (
                      <button
                        type="button"
                        className="btn compact primary"
                        onClick={() => setResolvePrompt(t)}
                        disabled={resolving}
                      >
                        Reply & Close
                      </button>
                    ) : (
                      <span className="muted">Closed</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">No support tickets found.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}


