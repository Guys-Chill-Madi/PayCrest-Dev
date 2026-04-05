import "../styles/page-transition-loader.css";

type Props = {
  active: boolean;
  durationMs: number;
  runId: number;
};

export default function PageTransitionLoader({ active, durationMs, runId }: Props) {
  if (!active) return null;

  return (
    <div className="route-loader-overlay" role="status" aria-live="polite" aria-label="Loading">
      <div className="route-loader-card">
        <div className="route-loader-title">Loading...</div>
        <div className="route-loader-track" style={{ ["--route-loader-duration" as string]: `${durationMs}ms` }}>
          <span className="route-loader-dots" aria-hidden="true" />
          <span className="route-loader-bank" aria-hidden="true">
            <svg viewBox="0 0 26 26" className="bank-icon" focusable="false" aria-hidden="true">
              <path d="M3 10.5h20" />
              <path d="M6 10.5v8.5M10.5 10.5v8.5M15.5 10.5v8.5M20 10.5v8.5" />
              <path d="M2.5 19h21" />
              <path d="M13 4l10 4H3l10-4z" />
            </svg>
          </span>
          <span className="route-loader-coin" key={`coin-${runId}`} aria-hidden="true">₹</span>
        </div>
      </div>
    </div>
  );
}
