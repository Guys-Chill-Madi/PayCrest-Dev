import { useEffect, useRef } from "react";
import LoanCard from "../components/LoanCard";
import "../styles/dashboard.css";
import type { LoanType } from "../components/loanConfig";
import type { CustomerLoanOffer } from '../../../modules/customer/services/customerApi';

export type { LoanType };

interface CustomerDashboardProps {
  kycApproved?: boolean;
  hasActiveLoan?: boolean;
  loanOffers?: Partial<Record<LoanType, CustomerLoanOffer>>;
  onApplyLoan?: (loanType: LoanType) => void;
  onEmiOpen?: (loanType: LoanType) => void;
}

const loanProducts = [
  {
    loanType: "personal" as const,
    title: "Personal Loan",
    categoryLabel: "Instant Approval",
    description: "Quick funds for your personal goals with minimal documentation.",
    icon: "PL",
    amountRange: "Rs 10K - Rs 25L",
    interestRange: "10.5% - 14.5%",
    tenureRange: "1 - 5 Years",
    eligibleAmount: "Rs 21.6L",
    eligibleInterest: "11.5%",
    features: ["No collateral required", "Same-day disbursal"],
    theme: "personal" as const,
    isPopular: true,
  },
  {
    loanType: "vehicle" as const,
    title: "Vehicle Loan",
    categoryLabel: "Auto Finance",
    description: "Get your two-wheeler or car financed with fast approvals.",
    icon: "VL",
    amountRange: "Rs 5L - Rs 60L",
    interestRange: "9.0% - 11.5%",
    tenureRange: "1 - 7 Years",
    eligibleAmount: "Rs 12L",
    eligibleInterest: "9.6%",
    features: ["Up to 100% on-road funding", "Flexible prepayment options"],
    theme: "vehicle" as const,
  },
  {
    loanType: "home" as const,
    title: "Home Loan",
    categoryLabel: "Property Finance",
    description: "Finance your dream home with long tenures and competitive rates.",
    icon: "HL",
    amountRange: "Rs 15L - Rs 2Cr",
    interestRange: "8.25% - 9.25%",
    tenureRange: "5 - 30 Years",
    eligibleAmount: "Rs 45L",
    eligibleInterest: "8.75%",
    features: ["High-ticket eligibility", "Long repayment tenure"],
    theme: "home" as const,
  },
  {
    loanType: "education" as const,
    title: "Education Loan",
    categoryLabel: "Student Finance",
    description: "Fund tuition and academic expenses with flexible repayment tenure.",
    icon: "EL",
    amountRange: "Rs 2L - Rs 35L",
    interestRange: "10.9% - 13.9%",
    tenureRange: "1 - 10 Years",
    eligibleAmount: "Rs 15L",
    eligibleInterest: "11.9%",
    features: ["Covers tuition and related fees", "Optional collateral support"],
    theme: "education" as const,
  },
];

function compactINR(value: number) {
  const safe = Math.max(0, Number(value) || 0);
  if (safe >= 10000000) return `Rs ${(safe / 10000000).toFixed(1).replace(/\.0$/, "")}Cr`;
  if (safe >= 100000) return `Rs ${(safe / 100000).toFixed(1).replace(/\.0$/, "")}L`;
  if (safe >= 1000) return `Rs ${(safe / 1000).toFixed(0)}K`;
  return `Rs ${Math.round(safe).toLocaleString("en-IN")}`;
}

function tenureLabel(minMonths: number, maxMonths: number) {
  const minYears = +(minMonths / 12).toFixed(1);
  const maxYears = +(maxMonths / 12).toFixed(1);
  return `${minYears.toString().replace(/\.0$/, "")} - ${maxYears.toString().replace(/\.0$/, "")} Years`;
}

export default function CustomerDashboard({
  kycApproved = false,
  hasActiveLoan = false,
  loanOffers,
  onApplyLoan,
  onEmiOpen,
}: CustomerDashboardProps) {
  const carouselRef = useRef<HTMLElement | null>(null);
  const groupedProducts = [];

  for (let i = 0; i < loanProducts.length; i += 2) {
    groupedProducts.push(loanProducts.slice(i, i + 2));
  }

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const groups = Array.from(
      carousel.querySelectorAll<HTMLElement>(".loan-row-group")
    );

    let observer: IntersectionObserver | null = null;

    const setupObserver = () => {
      if (observer) observer.disconnect();

      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            entry.target.classList.toggle("is-visible", entry.isIntersecting);
          });
        },
        {
          root: null,
          threshold: 0.28,
          rootMargin: "0px 0px -10% 0px",
        }
      );

      groups.forEach((group) => observer?.observe(group));
    };

    setupObserver();
    window.addEventListener("resize", setupObserver);

    return () => {
      window.removeEventListener("resize", setupObserver);
      observer?.disconnect();
    };
  }, []);

  return (
    <div className="dashboard-container">
      <h2 className="dashboard-title">Available Loan Products</h2>
      <p className="dashboard-subtitle">
        Scroll to explore premium loan cards and compare offers side by side.
      </p>

      <section className="loan-carousel" aria-label="Loan product cards" ref={carouselRef}>
        {groupedProducts.map((group, groupIndex) => (
          <div
            className={`loan-row-group ${groupIndex === 0 ? "is-visible" : ""}`}
            key={`group-${groupIndex}`}
          >
            {group.map((loan, cardIndex) => {
              const offer = loanOffers?.[loan.loanType];
              const mergedLoan = offer
                ? {
                    ...loan,
                    amountRange: `${compactINR(offer.min_amount)} - ${compactINR(offer.max_amount)}`,
                    interestRange: `${offer.interest_rate.toFixed(2)}%`,
                    tenureRange: tenureLabel(offer.min_tenure_months, offer.max_tenure_months),
                    eligibleAmount: `${compactINR(offer.eligible_min_amount)} - ${compactINR(offer.eligible_max_amount)}`,
                    eligibleInterest: `${offer.interest_rate.toFixed(2)}%`,
                  }
                : loan;
              const { loanType, ...loanCardData } = mergedLoan;
              return (
                <LoanCard
                  key={loan.title}
                  animationIndex={groupIndex * 2 + cardIndex}
                  kycApproved={kycApproved}
                  hasActiveLoan={hasActiveLoan}
                  onApply={() => {
                    if (onApplyLoan) onApplyLoan(loanType);
                    else console.log(`Apply ${loan.title}`);
                  }}
                  onEmi={() => {
                    if (onEmiOpen) onEmiOpen(loanType);
                    else console.log(`EMI ${loan.title}`);
                  }}
                  {...loanCardData}
                />
              );
            })}
          </div>
        ))}
      </section>
    </div>
  );
}


