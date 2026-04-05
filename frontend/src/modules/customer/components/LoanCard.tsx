interface LoanCardProps {
  title: string;
  categoryLabel: string;
  description: string;
  icon: string;
  imageSrc?: string;
  imageAlt?: string;
  amountRange: string;
  interestRange: string;
  tenureRange: string;
  eligibleAmount?: string;
  eligibleInterest?: string;
  kycApproved: boolean;
  hasActiveLoan?: boolean;
  features: string[];
  theme: "personal" | "home" | "vehicle" | "education";
  isPopular?: boolean;
  animationIndex?: number;
  onApply: () => void;
  onEmi: () => void;
}

export default function LoanCard({
  title,
  categoryLabel,
  description,
  icon,
  imageSrc,
  imageAlt,
  amountRange,
  interestRange,
  tenureRange,
  eligibleAmount,
  eligibleInterest,
  kycApproved,
  hasActiveLoan = false,
  features,
  theme,
  isPopular,
  animationIndex = 0,
  onApply,
  onEmi,
}: LoanCardProps) {
  const applyDisabled = !kycApproved || hasActiveLoan;
  const applyHint = !kycApproved
    ? "Complete KYC to unlock this loan"
    : hasActiveLoan
    ? "Active loan in progress. Complete it before applying again."
    : "";

  return (
    <article
      className={`loan-card ${theme}`}
      style={{ animationDelay: `${animationIndex * 130}ms` }}
    >
      {isPopular && <span className="popular-badge">Most Popular</span>}

      <div className="loan-visual-panel">
        <span className="bubble bubble-top" />
        <span className="bubble bubble-bottom" />

        {imageSrc ? (
          <img className="loan-photo" src={imageSrc} alt={imageAlt || `${title} illustration`} />
        ) : (
          <div className="loan-icon" aria-hidden="true">
            {icon}
          </div>
        )}
        <h3 className="loan-visual-title">{title}</h3>
      </div>

      <div className="loan-content-panel">
        <div className="loan-top">
          <div className="loan-heading">
            <span className="category-pill">{categoryLabel}</span>
            <h4 className="loan-title">{title}</h4>
            <p className="loan-description">{description}</p>
          </div>
          <span className={`status-chip ${kycApproved ? "approved" : "locked"}`}>
            {kycApproved ? "KYC Verified" : "KYC Pending"}
          </span>
        </div>

        <div className="section-block">
          <p className="section-title">Loan Terms</p>
          <div className="loan-info-box">
            <div className="loan-row">
              <span>Amount Range</span>
              <strong>{amountRange}</strong>
            </div>
            <div className="loan-row">
              <span>Interest Rate</span>
              <strong>{interestRange}</strong>
            </div>
            <div className="loan-row">
              <span>Tenure</span>
              <strong>{tenureRange}</strong>
            </div>
          </div>
        </div>

        <div className="section-block">
          <p className="section-title">Your Eligibility</p>
          <div className="eligibility-box">
            <div className="eligibility-grid">
              <div>
                <span>Eligible Amount</span>
                <strong>{eligibleAmount || "N/A"}</strong>
              </div>
              <div>
                <span>Offered Interest</span>
                <strong>{eligibleInterest || "N/A"}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="section-block">
          <p className="section-title">Benefits</p>
          <ul className="feature-list">
            {features.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="card-actions">
          <button className="btn-outline" onClick={onEmi}>
            Calculate EMI
          </button>
          <button className="btn-primary" disabled={applyDisabled} onClick={onApply}>
            Apply Now
          </button>
        </div>

        {applyHint && <p className="kyc-warning">{applyHint}</p>}
      </div>
    </article>
  );
}


