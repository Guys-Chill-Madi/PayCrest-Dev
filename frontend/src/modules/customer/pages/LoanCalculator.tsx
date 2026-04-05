import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { getInterestRateWithOverride, LOAN_CONFIG } from "../components/loanConfig";
import type { LoanType } from "../components/loanConfig";
import "../styles/loan-calculator.css";

interface LoanCalculatorProps {
  loanType: LoanType;
  offerInterestRate?: number | null;
  offerMinAmount?: number;
  offerMaxAmount?: number;
  offerMinTenure?: number;
  offerMaxTenure?: number;
  onBackToLoans: () => void;
  onProceedToApply: (loanType: LoanType) => void;
}

export default function LoanCalculator({
  loanType,
  offerInterestRate,
  offerMinAmount,
  offerMaxAmount,
  offerMinTenure,
  offerMaxTenure,
  onBackToLoans,
  onProceedToApply,
}: LoanCalculatorProps) {
  const config = LOAN_CONFIG[loanType];
  const minAmount = Math.max(config.minAmount, offerMinAmount ?? config.minAmount);
  const maxAmountFromOffer = typeof offerMaxAmount === "number" && offerMaxAmount > 0 ? offerMaxAmount : config.maxAmount;
  const calculatorMaxAmount = Math.max(minAmount, Math.min(maxAmountFromOffer, config.maxAmount));
  const minTenure = Math.max(config.minTenure, offerMinTenure ?? config.minTenure);
  const maxTenureFromOffer = Math.min(config.maxTenure, offerMaxTenure ?? config.maxTenure);
  const calculatorMaxTenure = Math.max(minTenure, Math.min(maxTenureFromOffer, 120));
  const [amount, setAmount] = useState<number>(minAmount);
  const [tenure, setTenure] = useState<number>(minTenure);

  useEffect(() => {
    setAmount(minAmount);
    setTenure(minTenure);
  }, [loanType, minAmount, minTenure]);

  const calculatedInterestRate = useMemo(
    () => getInterestRateWithOverride(loanType, amount, offerInterestRate),
    [loanType, amount, offerInterestRate],
  );

  // Snapshot the interest rate on component mount / when loanType changes.
  // This prevents the displayed rate shifting when backend/admin updates rates
  // or when amount/tenure change after the initial load.
  const [interestRate, setInterestRate] = useState<number>(calculatedInterestRate);
  useEffect(() => {
    setInterestRate(calculatedInterestRate);
  }, [calculatedInterestRate, loanType]);

  const monthlyRate = interestRate / 12 / 100;

  const emi = Math.round(
    monthlyRate === 0
      ? amount / tenure
      : (amount * monthlyRate * Math.pow(1 + monthlyRate, tenure)) /
          (Math.pow(1 + monthlyRate, tenure) - 1)
  );

  const totalPayable = emi * tenure;
  const totalInterest = Math.max(totalPayable - amount, 0);
  const principalShare = totalPayable > 0 ? Math.round((amount / totalPayable) * 100) : 0;
  const interestShare = 100 - principalShare;

  return (
    <section className="loan-calc-page" aria-label="Loan EMI calculator">
      <div className="loan-calc-page__header">
        <h2>{loanType.charAt(0).toUpperCase() + loanType.slice(1)} Loan Calculator</h2>
        <p>Check EMI before applying. Interest changes by loan type and amount.</p>
      </div>

      <div className="loan-calc-grid">
        <section className="loan-calc-inputs">
          <div className="loan-calc-field">
            <div className="loan-calc-label-row">
              <label htmlFor="loan-calc-amount">Loan Amount</label>
              <strong>Rs {amount.toLocaleString("en-IN")}</strong>
            </div>
            <input
              id="loan-calc-amount"
              className="loan-range"
              type="range"
              min={minAmount}
              max={calculatorMaxAmount}
              step={config.amountStep}
              value={amount}
              onChange={(e) =>
                setAmount(Math.min(Number(e.target.value), calculatorMaxAmount))
              }
            />
            <div className="loan-calc-minmax">
              <span>Rs {minAmount.toLocaleString("en-IN")}</span>
              <span>Rs {calculatorMaxAmount.toLocaleString("en-IN")}</span>
            </div>
          </div>

          <div className="loan-calc-field">
            <div className="loan-calc-label-row">
              <label>Interest Rate (p.a)</label>
              <strong>{interestRate.toFixed(2)}%</strong>
            </div>
            <p className="loan-calc-note">Auto-selected using your amount and loan type.</p>
          </div>

          <div className="loan-calc-field">
            <div className="loan-calc-label-row">
              <label htmlFor="loan-calc-tenure">Tenure (Months)</label>
              <strong>{tenure} M</strong>
            </div>
            <input
              id="loan-calc-tenure"
              className="loan-range"
              type="range"
              min={minTenure}
              max={calculatorMaxTenure}
              step={config.tenureStep}
              value={tenure}
              onChange={(e) =>
                setTenure(Math.min(Number(e.target.value), calculatorMaxTenure))
              }
            />
            <div className="loan-calc-minmax">
              <span>{minTenure}M</span>
              <span>{calculatorMaxTenure}M</span>
            </div>
          </div>
        </section>

        <aside className="loan-calc-summary">
          <div
            className="loan-calc-donut"
            style={{ "--principal-share": `${principalShare}%` } as CSSProperties}
          >
            <div className="loan-calc-donut-inner">
              <span>Total Payable</span>
              <strong>Rs {totalPayable.toLocaleString("en-IN")}</strong>
            </div>
          </div>

          <div className="loan-calc-legend">
            <div>
              <span className="dot dot-principal" />
              <p>Principal</p>
              <strong>Rs {amount.toLocaleString("en-IN")}</strong>
            </div>
            <div>
              <span className="dot dot-interest" />
              <p>Interest</p>
              <strong>Rs {totalInterest.toLocaleString("en-IN")}</strong>
            </div>
          </div>
        </aside>
      </div>

      <div className="loan-calc-emi-banner">
        <div>
          <span>Your EMI</span>
          <strong>Rs {emi.toLocaleString("en-IN")} / month</strong>
        </div>
        <div className="loan-calc-actions">
          <button type="button" className="btn-outline" onClick={onBackToLoans}>
            Back to Loan Offers
          </button>
          <button type="button" className="btn-primary" onClick={() => onProceedToApply(loanType)}>
            Proceed to Apply
          </button>
        </div>
      </div>

      <div className="loan-calc-share-note">
        <span>Principal share: {principalShare}%</span>
        <span>Interest share: {interestShare}%</span>
      </div>
    </section>
  );
}

