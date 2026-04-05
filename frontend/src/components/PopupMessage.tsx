import React, { useEffect } from "react";

function sanitizeText(s: string) {
  let t = String(s).replace(/`+/g, '"').replace(/\n\s*```[\s\S]*?```/g, "");
  t = t.replace(/\s*\(https?:\/\/[^)]+\)/g, "");
  t = t.replace(/^\s*\d{3}\s+[^:]*:\s*/i, "");
  return t.trim();
}

function buildHumanMessage(msg: any): string {
  if (msg === null || msg === undefined) return "";
  if (typeof msg === "string") return sanitizeText(msg);
  if (msg instanceof Error) {
    const e: any = msg as any;
    if (e.humanMessage) return sanitizeText(e.humanMessage);
    if (e.response) {
      const resp = e.response;
      if (resp.detail && resp.detail.details && typeof resp.detail.details === "object") {
        const parts = Object.entries(resp.detail.details).map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`);
        return sanitizeText(`${resp.detail.error || "Validation failed"}: ${parts.join("; ")}`);
      }
      if (resp.detail && typeof resp.detail === "string") return sanitizeText(resp.detail);
      if (resp.message) return sanitizeText(String(resp.message));
    }
    return sanitizeText(msg.message || String(msg));
  }
  if (typeof msg === "object") {
    if (msg.detail && msg.detail.details) {
      const parts = Object.entries(msg.detail.details).map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`);
      return sanitizeText(`${msg.detail.error || "Validation failed"}: ${parts.join("; ")}`);
    }
    try {
      return sanitizeText(JSON.stringify(msg));
    } catch {
      return String(msg);
    }
  }
  return sanitizeText(String(msg));
}

function guessFocusSelector(text: string): string | null {
  const t = text.toLowerCase();
  if (t.includes("email")) return 'input[name="email"], input[type="email"]';
  if (t.includes("pan")) return 'input[name="pan"]';
  if (t.includes("m-pin") || t.includes("mpin") || t.includes("pin"))
    return 'input[type="password"][maxLength="4"], input[name*="mpin"]';
  if (t.includes("password")) return 'input[type="password"]';
  if (t.includes("dob") || t.includes("date of birth")) return 'input[name="dob"], input[type="date"]';
  if (t.includes("phone") || t.includes("mobile")) return 'input[name="phone"]';
  return null;
}

export default function PopupMessage({
  type = "error",
  title,
  message,
  onClose,
}: {
  type?: "error" | "success" | "info";
  title?: string;
  message: any;
  onClose?: () => void;
}) {
  const text = buildHumanMessage(message);
  const headingId = "popup-message-title";
  const bodyId = "popup-message-body";
  const isError = type === "error";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose && onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleClose = () => {
    const selector = guessFocusSelector(text);
    if (selector) {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (el) {
        el.focus();
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }
    onClose && onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      aria-describedby={bodyId}
      onClick={handleClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        pointerEvents: "auto",
        backgroundColor: "rgba(16, 33, 61, 0.55)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(560px, 92%)",
          maxWidth: 560,
          background: "#ffffff",
          borderRadius: 12,
          boxShadow: "0 8px 24px rgba(2,6,23,0.08)",
          padding: 18,
          border: isError ? "1px solid #fca5a5" : "1px solid #bbf7d0",
          pointerEvents: "auto",
          maxHeight: "60vh",
          overflow: "auto",
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{ fontSize: 22, lineHeight: 1 }} aria-hidden>
            {isError ? "\u26A0\uFE0F" : "\u2705"}
          </div>
          <div style={{ flex: 1 }}>
            <div id={headingId} style={{ fontWeight: 800, marginBottom: 6, fontSize: 18 }}>
              {title || (isError ? "Error" : "Success")}
            </div>
            <div id={bodyId} style={{ color: "#0f172a", whiteSpace: "pre-wrap", fontSize: 14 }}>
              {text}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
          <button
            onClick={handleClose}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "none",
              background: isError ? "#ef4444" : "#059669",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
