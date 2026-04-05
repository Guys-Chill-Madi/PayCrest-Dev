import CustomerDashboard from "../../CustomerDashboard";
import type { LoanType } from "../../CustomerDashboard";
import LoanApplication from "../../LoanApplication";
import LoanCalculator from "../../LoanCalculator";
import type { CustomerLoanOffer } from "../../../../../modules/customer/services/customerApi";

type LoansTabProps = {
  kycApproved: boolean;
  hasActiveLoan: boolean;
  loanOffers: Partial<Record<LoanType, CustomerLoanOffer>>;
  selectedLoanType: LoanType | null;
  loanEntryMode: "apply" | "calculator";
  onApplyLoan: (loanType: LoanType) => void;
  onEmiOpen: (loanType: LoanType) => void;
  onBackToOffers: () => void;
  onProceedToApply: (loanType: LoanType) => void;
  onSubmitted: () => void;
};

export default function LoansTab({
  kycApproved,
  hasActiveLoan,
  loanOffers,
  selectedLoanType,
  loanEntryMode,
  onApplyLoan,
  onEmiOpen,
  onBackToOffers,
  onProceedToApply,
  onSubmitted,
}: LoansTabProps) {
  if (!selectedLoanType) {
    return (
      <section className="portal-view portal-view--loans">
        <CustomerDashboard
          kycApproved={kycApproved}
          hasActiveLoan={hasActiveLoan}
          loanOffers={loanOffers}
          onApplyLoan={onApplyLoan}
          onEmiOpen={onEmiOpen}
        />
      </section>
    );
  }

  const offer = loanOffers[selectedLoanType];

  return (
    <section className="portal-view portal-view--loans loan-app-panel">
      <div className="loan-app-panel__head">
        <h2>{loanEntryMode === "calculator" ? "Loan Calculator" : "Loan Application"}</h2>
        <button
          type="button"
          className="portal-btn-secondary"
          onClick={onBackToOffers}
        >
          Back to Loan Offers
        </button>
      </div>
      {loanEntryMode === "calculator" ? (
        <LoanCalculator
          loanType={selectedLoanType}
          offerInterestRate={offer?.interest_rate}
          offerMinAmount={offer?.eligible_min_amount ?? offer?.min_amount}
          offerMaxAmount={offer?.eligible_max_amount ?? offer?.max_amount}
          offerMinTenure={offer?.min_tenure_months}
          offerMaxTenure={offer?.max_tenure_months}
          onBackToLoans={onBackToOffers}
          onProceedToApply={onProceedToApply}
        />
      ) : (
        <LoanApplication
          loanType={selectedLoanType}
          offerInterestRate={offer?.interest_rate}
          offerMinAmount={offer?.eligible_min_amount ?? offer?.min_amount}
          offerMaxAmount={offer?.eligible_max_amount ?? offer?.max_amount}
          offerMinTenure={offer?.min_tenure_months}
          offerMaxTenure={offer?.max_tenure_months}
          onSubmitted={onSubmitted}
        />
      )}
    </section>
  );
}
