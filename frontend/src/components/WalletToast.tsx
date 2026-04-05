import { useEffect, useMemo } from "react";

type ToastMode = "credit" | "debit";
type ToastContext = "wallet" | "emi";

export default function WalletToast({
  amount,
  onClose,
  mode = "credit",
  context = "wallet",
}: {
  amount: number;
  onClose?: () => void;
  mode?: ToastMode;
  context?: ToastContext;
}) {
  const AUTO_CLOSE_MS = 2600;

  useEffect(() => {
    const timer = window.setTimeout(() => onClose?.(), AUTO_CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [onClose]);

  const title = useMemo(() => {
    if (mode === "credit") return "Amount Credited";
    if (context === "emi") return "EMI Paid";
    return "Amount Debited";
  }, [context, mode]);

  const subtitle = useMemo(() => {
    if (mode === "credit") return "Amount credited to wallet successfully.";
    if (context === "emi") return "EMI payment completed successfully.";
    return "Amount debited from wallet successfully.";
  }, [context, mode]);

  const amountLabel = `${mode === "debit" ? "-" : "+"} INR ${Math.abs(Number(amount || 0)).toLocaleString("en-IN")}`;

  return (
    <div style={styles.overlay} role="status" aria-live="polite">
      <div style={styles.card}>
        <div style={styles.successBadge} aria-hidden>
          <svg viewBox="0 0 24 24" style={styles.checkSvg}>
            <path d="M5 12.5l4.3 4.3L19 7.8" style={styles.checkPath} />
          </svg>
        </div>
        <div style={styles.title}>{title}</div>
        <div style={styles.subtitle}>{subtitle}</div>
        <div style={styles.amount}>{amountLabel}</div>
        <div style={styles.progressWrap} aria-hidden>
          <div style={styles.progressBar} />
        </div>
        <button type="button" style={styles.button} onClick={() => onClose?.()}>
          OK
        </button>
      </div>
    </div>
  );
}

export const walletCenterKeyframes = `
@keyframes wallet-toast-pop {
  0% { transform: translateY(10px) scale(0.96); opacity: 0; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}
@keyframes wallet-success-ring {
  0% { transform: scale(0.6); opacity: 0.2; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes wallet-check-draw {
  0% { stroke-dashoffset: 36; }
  100% { stroke-dashoffset: 0; }
}
`;

export const walletToastKeyframes = `
@keyframes wallet-progress-run {
  from { width: 100%; }
  to { width: 0%; }
}
`;

const styles: Record<string, any> = {
  overlay: {
    position: "fixed",
    inset: 0,
    display: "grid",
    placeItems: "center",
    zIndex: 13000,
    background: "rgba(2, 6, 23, 0.55)",
    pointerEvents: "auto",
  },
  card: {
    width: "min(420px, 92vw)",
    borderRadius: 16,
    background: "#ffffff",
    border: "1px solid #d9e4f5",
    boxShadow: "0 24px 56px rgba(2, 6, 23, 0.25)",
    padding: "20px 18px 16px",
    display: "grid",
    gap: 10,
    justifyItems: "center",
    animation: "wallet-toast-pop 360ms cubic-bezier(.2,.9,.2,1)",
  },
  successBadge: {
    width: 64,
    height: 64,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    background: "radial-gradient(circle at 30% 30%, #dcfce7, #16a34a)",
    boxShadow: "0 10px 24px rgba(22, 163, 74, 0.35)",
    animation: "wallet-success-ring 360ms ease-out",
  },
  checkSvg: {
    width: 30,
    height: 30,
  },
  checkPath: {
    fill: "none",
    stroke: "#ffffff",
    strokeWidth: 3,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeDasharray: 36,
    strokeDashoffset: 36,
    animation: "wallet-check-draw 520ms ease-out 120ms forwards",
  },
  title: {
    textAlign: "center",
    fontWeight: 900,
    fontSize: 22,
    color: "#0f172a",
  },
  subtitle: {
    textAlign: "center",
    fontWeight: 700,
    fontSize: 14,
    color: "#334155",
  },
  amount: {
    marginTop: 2,
    textAlign: "center",
    fontWeight: 900,
    color: "#0f172a",
    fontSize: 18,
  },
  progressWrap: {
    width: "100%",
    height: 4,
    background: "#e2e8f0",
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 4,
  },
  progressBar: {
    height: "100%",
    width: "100%",
    background: "linear-gradient(90deg, #1d4ed8, #22c55e)",
    animation: "wallet-progress-run 2600ms linear forwards",
  },
  button: {
    marginTop: 4,
    borderRadius: 10,
    border: "1px solid #b7c9e3",
    background: "#ffffff",
    color: "#1f5fbf",
    fontWeight: 800,
    padding: "8px 14px",
    cursor: "pointer",
  },
};
