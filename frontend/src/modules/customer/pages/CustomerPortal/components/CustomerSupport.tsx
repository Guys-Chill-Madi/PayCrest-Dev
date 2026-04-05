import { useMemo, useState } from "react";
import DataState from "../../../../../components/ui/DataState";
import type { CustomerSupportTicket, SupportCategory, SupportTicketAttachment } from '../../../../../modules/customer/services/customerApi';

export type SupportTicket = CustomerSupportTicket;

type Props = {
  tickets: SupportTicket[];
  loading?: boolean;
  creating?: boolean;
  onCreate?: (ticket: {
    category: SupportCategory;
    subject: string;
    message: string;
    attachment?: SupportTicketAttachment | null;
  }) => void | Promise<void>;
  onRefresh?: () => void;
};

const categoryLabel = (c: SupportTicket["category"]) => {
  if (c === "kyc") return "KYC";
  if (c === "payment") return "Payment";
  if (c === "loan") return "Loan";
  if (c === "wallet") return "Wallet";
  if (c === "documents") return "Documents";
  return "Other";
};

export default function CustomerSupport({ tickets, loading = false, creating = false, onCreate, onRefresh }: Props) {
  const [category, setCategory] = useState<SupportTicket["category"]>("payment");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const sorted = useMemo(() => {
    const rows = Array.isArray(tickets) ? tickets : [];
    return rows.slice().sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
  }, [tickets]);

  const openCount = sorted.filter((t) => t.status === "open").length;

  return (
    <div className="custx-root">
      <div className="custx-head">
        <div>
          <h2 style={{ margin: 0 }}>Support</h2>
          <p className="custx-muted" style={{ marginTop: 6 }}>
            Raise a ticket. Admin will reply and close the ticket after resolution.
          </p>
        </div>
        <div className="custx-actions">
          <span className="custx-muted">Open: {openCount}</span>
          <button type="button" className="custx-btn" onClick={onRefresh} disabled={!onRefresh || loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      <section className="custx-card">
        <h3 style={{ margin: 0 }}>Create Ticket</h3>
        <div className="custx-form">
          <label>
            <span>Category (Required)</span>
            <select value={category} onChange={(e) => setCategory(e.target.value as any)}>
              <option value="kyc">KYC</option>
              <option value="payment">Payment</option>
              <option value="loan">Loan</option>
              <option value="wallet">Wallet</option>
              <option value="documents">Documents</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            <span>Subject (Required)</span>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Short summary" aria-label="Support ticket subject" />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            <span>Message (Required)</span>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Describe your issue" aria-label="Support ticket message" />
          </label>
          <label style={{ gridColumn: "1 / -1" }} className="custx-file-field">
            <span>Attachment (Optional)</span>
            <input className="custx-file-input" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
        </div>
        <div className="custx-actions">
          <button
            type="button"
            className="custx-btn primary"
            disabled={!onCreate || creating || !subject.trim() || !message.trim()}
            onClick={async () => {
              if (!onCreate) return;
              await onCreate({
                category,
                subject: subject.trim(),
                message: message.trim(),
                attachment: file ? { name: file.name, size: file.size, type: file.type } : null,
              });
              setSubject("");
              setMessage("");
              setFile(null);
            }}
          >
            {creating ? "Submitting..." : "Submit"}
          </button>
        </div>
      </section>

      <section className="custx-card" style={{ marginTop: 14 }}>
        <div className="custx-head" style={{ marginBottom: 10 }}>
          <div>
            <h3 style={{ margin: 0 }}>Your Tickets</h3>
            <p className="custx-muted" style={{ marginTop: 6 }}>
              Track admin replies and closure status here.
            </p>
          </div>
        </div>

        {loading ? (
          <DataState variant="loading" title="Loading support tickets" message="Fetching latest updates from support desk." />
        ) : !sorted.length ? (
          <DataState
            variant="empty"
            title="No support tickets yet"
            message="Need help with EMI, wallet, KYC, or loan documents? Create a ticket and admin will respond."
          />
        ) : (
          <div className="custx-table-wrap" role="region" aria-label="Support tickets table">
            <table className="custx-table">
              <thead>
                <tr>
                  <th>Created</th>
                  <th>Category</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Admin Reply</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((t) => (
                  <tr key={t.ticket_id}>
                    <td>{new Date(t.created_at).toLocaleString()}</td>
                    <td>{categoryLabel(t.category)}</td>
                    <td>
                      <div style={{ display: "grid", gap: 4 }}>
                        <strong style={{ color: "var(--text-primary)" }}>{t.subject}</strong>
                        <span className="custx-muted" style={{ whiteSpace: "normal" }}>{t.message}</span>
                      </div>
                    </td>
                    <td>{t.status}</td>
                    <td>
                      {t.admin_reply ? (
                        <div style={{ display: "grid", gap: 4 }}>
                          <span>{t.admin_reply}</span>
                          {t.resolved_at ? <span className="custx-muted">Resolved: {new Date(t.resolved_at).toLocaleString()}</span> : null}
                        </div>
                      ) : (
                        <span className="custx-muted">Awaiting admin response</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}


