import { inferLoanType, toTitleCase, type LoanRecord } from "../utils";

export default function CustomerProfile({
  email,
  name,
  kycStatus,
  cibilScore,
  latestApp,
  onChangeMpin,
}: {
  email: string;
  name: string;
  kycStatus: string;
  cibilScore?: number | null;
  latestApp?: LoanRecord;
  onChangeMpin?: () => void;
}) {
  const status = String(kycStatus || "").toLowerCase();
  const statusClass = status.includes("approved")
    ? "ds-badge ds-badge--verified"
    : status.includes("pending")
      ? "ds-badge ds-badge--pending"
      : "ds-badge ds-badge--restricted";

  return (
    <section className="profile-root" aria-label="Customer profile">
      <div className="profile-head">
        <h2>Customer Profile</h2>
        <p>Live snapshot of your identity and latest loan activity.</p>
      </div>

      <div className="profile-grid">
        <article className="profile-card profile-card-personal">
          <h3>Personal Information</h3>
          <div className="profile-kv">
            <div>
              <span>Full Name</span>
              <strong>{name}</strong>
            </div>
            <div>
              <span>Email</span>
              <strong>{email}</strong>
            </div>
            <div>
              <span>KYC Status</span>
              <strong>
                <span className={statusClass}>{kycStatus}</span>
              </strong>
            </div>
            <div>
              <span>Latest Loan</span>
              <strong>{latestApp ? inferLoanType(latestApp) : "N/A"}</strong>
            </div>
            <div>
              <span>CIBIL Score</span>
              <strong>{typeof cibilScore === "number" ? cibilScore : "Not Available"}</strong>
            </div>
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button className="profile-mpin-btn" onClick={() => onChangeMpin && onChangeMpin()}>
              Change M-PIN
            </button>
          </div>
        </article>

        <article className="profile-card profile-card-wide">
          <h3>Loan Details</h3>
          <div className="profile-loan-grid profile-loan-grid-head">
            <span>Loan Type</span>
            <span>Amount</span>
            <span>Tenure</span>
            <span>Status</span>
            <span>Last Update</span>
          </div>
          <div className="profile-loan-grid">
            <strong>{latestApp ? inferLoanType(latestApp) : "N/A"}</strong>
            <strong>{latestApp?.loan_amount ? `INR ${latestApp.loan_amount}` : "N/A"}</strong>
            <strong>{latestApp?.tenure_months ? `${latestApp.tenure_months} months` : "N/A"}</strong>
            <strong>{latestApp?.status ? toTitleCase(latestApp.status) : "N/A"}</strong>
            <strong>{latestApp?.updated_at ? new Date(latestApp.updated_at).toLocaleDateString() : "N/A"}</strong>
          </div>
        </article>
      </div>
    </section>
  );
}

