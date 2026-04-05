import { useMemo } from "react";
import { formatISTDateTime } from "../../../../../lib/datetime";
import DataState from "../../../../../components/ui/DataState";

export type CustomerNotification = {
  id: string;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
  kind?: "info" | "success" | "warning" | "error";
};

type Props = {
  items: CustomerNotification[];
  onMarkAllRead?: () => void;
  onClearAll?: () => void;
  onMarkRead?: (id: string) => void;
};

const kindLabel = (kind?: CustomerNotification["kind"]) => {
  if (kind === "success") return "Success";
  if (kind === "warning") return "Warning";
  if (kind === "error") return "Error";
  return "Info";
};

export default function CustomerNotifications({ items, onMarkAllRead, onClearAll, onMarkRead }: Props) {
  const normalizeMessage = (title: string, message: string) => {
    const raw = String(message || "");
    if (title !== "Wallet Activity") return raw;
    return raw.replace(/\s-\s\d{1,2}\s[A-Za-z]{3}\s\d{4},\s\d{1,2}:\d{2}\s(?:am|pm)\s*$/i, "").trim();
  };

  const sorted = useMemo(() => {
    const rows = Array.isArray(items) ? items : [];
    return rows.slice().sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
  }, [items]);

  return (
    <div className="custx-root">
      <div className="custx-head">
        <div>
          <h2 style={{ margin: 0 }}>Notifications</h2>
          <p className="custx-muted" style={{ marginTop: 6 }}>
            Updates about KYC, disbursement, payments, and your loan status.
          </p>
        </div>
        <div className="custx-actions">
          <button type="button" className="custx-btn" onClick={onMarkAllRead} disabled={!onMarkAllRead || !sorted.length}>
            Mark all read
          </button>
          <button type="button" className="custx-btn" onClick={onClearAll} disabled={!onClearAll || !sorted.length}>
            Clear
          </button>
        </div>
      </div>

      {!sorted.length ? (
        <DataState
          variant="empty"
          title="No notifications yet"
          message="Account updates, payment alerts, and loan status changes will appear here."
        />
      ) : (
        <div className="custx-list" role="list">
          {sorted.map((n) => (
            <div key={n.id} className={`custx-note ${n.read ? "read" : "unread"}`} role="listitem">
              <div className="custx-note-top">
                <div style={{ display: "grid", gap: 4 }}>
                  <div className="custx-note-title">
                    <span className={`custx-pill ${n.kind || "info"}`}>{kindLabel(n.kind)}</span>
                    <strong>{n.title}</strong>
                  </div>
                  <div className="custx-muted">{formatISTDateTime(n.created_at)}</div>
                </div>
                {!n.read && onMarkRead ? (
                  <button type="button" className="custx-link" onClick={() => onMarkRead(n.id)}>
                    Mark read
                  </button>
                ) : null}
              </div>
              <div className="custx-note-body">{normalizeMessage(n.title, n.message)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

