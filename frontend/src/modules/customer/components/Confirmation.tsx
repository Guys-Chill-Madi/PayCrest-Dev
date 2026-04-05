interface ConfirmationProps {
  onTrackStatus: () => void;
}

export default function Confirmation({ onTrackStatus }: ConfirmationProps) {
  return (
    <div className="confirmation-card">
      <div className="success-animation" aria-hidden="true">
        <div className="coin-burst">
          <span className="coin coin-1" />
          <span className="coin coin-2" />
          <span className="coin coin-3" />
          <span className="coin coin-4" />
          <span className="coin coin-5" />
        </div>
        <div className="wallet">
          <span className="wallet-slot" />
          <span className="wallet-body" />
          <span className="wallet-shine" />
        </div>
      </div>
      <div className="confirmation-icon">Success</div>
      <h2>Application Submitted</h2>
      <p>
        Your loan application has been successfully submitted. Our verification team
        will review your documents.
      </p>

      <div className="review-card" style={{ marginTop: 20 }}>
        <h4>Next Steps</h4>
        <p>Verification by internal team</p>
        <p>Credit decision</p>
        <p>Status updates on dashboard</p>
      </div>

      <div className="button-row" style={{ marginTop: 24 }}>
        <button className="btn-primary" onClick={onTrackStatus}>
          Track Status
        </button>
      </div>
    </div>
  );
}

