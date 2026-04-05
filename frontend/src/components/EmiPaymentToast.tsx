import { useEffect } from "react";

export default function EmiPaymentToast({
  amountLabel,
  onClose,
}: {
  amountLabel?: string;
  onClose?: () => void;
}) {
  useEffect(() => {
    const t = window.setTimeout(() => onClose && onClose(), 3200);
    return () => window.clearTimeout(t);
  }, [onClose]);

  return (
    <div style={centerStyles.overlay} role="status" aria-live="polite">
      <style>{emiToastKeyframes}</style>
      <div style={centerStyles.card}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" }}>
          <div style={centerStyles.iconWrap} aria-hidden>
            <svg width="28" height="28" viewBox="0 0 52 52" style={{ display: "block" }}>
              <circle
                cx="26"
                cy="26"
                r="24"
                fill="none"
                stroke="rgba(16,185,129,0.28)"
                strokeWidth="4"
              />
              <path
                d="M14 27.5 L22 35 L39 18"
                fill="none"
                stroke="#10b981"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  strokeDasharray: 60,
                  strokeDashoffset: 60,
                  animation: "emi-check-draw 520ms ease-out 120ms forwards",
                }}
              />
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16, color: "#0f172a" }}>EMI paid successfully</div>
            <div style={{ color: "#065f46", fontWeight: 800, marginTop: 2 }}>
              {amountLabel ? amountLabel : "Payment completed"}
            </div>
          </div>
        </div>

        <div style={centerStyles.progress} aria-hidden>
          <div style={centerStyles.progressBar} />
        </div>
      </div>
    </div>
  );
}

export const emiToastKeyframes = `
@keyframes emi-toast-pop {
  0% { transform: translateY(10px) scale(0.96); opacity: 0; }
  60% { transform: translateY(-4px) scale(1.02); opacity: 1; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}

@keyframes emi-check-draw {
  to { stroke-dashoffset: 0; }
}

@keyframes emi-progress {
  from { transform: scaleX(1); }
  to { transform: scaleX(0); }
}
`;

const centerStyles: Record<string, any> = {
  overlay: {
    position: "fixed",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
    zIndex: 13010,
  },
  card: {
    pointerEvents: "auto",
    width: 320,
    height: 320,
    maxWidth: "92vw",
    maxHeight: "92vh",
    borderRadius: 14,
    padding: "22px 18px 16px",
    border: "1px solid rgba(187, 247, 208, 1)",
    background: "#ffffff",
    boxShadow: "0 16px 46px rgba(2,6,23,0.16)",
    animation: "emi-toast-pop 420ms cubic-bezier(.2,.9,.2,1)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: "linear-gradient(180deg, rgba(187,247,208,0.75), rgba(52,211,153,0.18))",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  progress: {
    marginTop: 10,
    height: 4,
    width: "100%",
    borderRadius: 999,
    background: "rgba(16,185,129,0.14)",
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    width: "100%",
    transformOrigin: "0 50%",
    background: "linear-gradient(90deg, #34d399, #10b981)",
    animation: "emi-progress 3200ms linear forwards",
  },
};
