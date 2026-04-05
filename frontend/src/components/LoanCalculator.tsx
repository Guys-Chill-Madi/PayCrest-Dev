import { useMemo, useState } from "react";
import "../styles/calculator.css";

const LoanCalculator = () => {
  const [amount, setAmount] = useState(500000);
  const [rate, setRate] = useState(9.99);
  const [tenure, setTenure] = useState(12);

  const calculation = useMemo(() => {
    const monthlyRate = rate / 12 / 100;
    const emi =
      (amount * monthlyRate * Math.pow(1 + monthlyRate, tenure)) /
      (Math.pow(1 + monthlyRate, tenure) - 1);

    const totalPayable = emi * tenure;
    const interest = totalPayable - amount;

    return {
      emi,
      interest,
      totalPayable,
    };
  }, [amount, rate, tenure]);

  const interestPercent = (calculation.interest / calculation.totalPayable) * 100;
  const monthlyRatePercent = rate / 12;

  return (
    <div className="calculator-card">
      <div className="calculator-left">
        <div className="calculator-head">
          <span className="calculator-badge">Smart Planner</span>
          <h2>EMI Calculator</h2>
          <p>Adjust amount, rate, and tenure to find a repayment plan that fits your budget.</p>
        </div>

        <div className="input-group">
          <label>Loan Amount</label>
          <span>INR {amount.toLocaleString("en-IN")}</span>
          <input
            type="range"
            min={10000}
            max={4000000}
            step={10000}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
        </div>

        <div className="input-group">
          <label>Interest Rate (p.a)</label>
          <span>{rate.toFixed(2)} %</span>
          <input
            type="range"
            min={5}
            max={22}
            step={0.1}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
          />
        </div>

        <div className="input-group">
          <label>Tenure (months)</label>
          <span>{tenure} M</span>
          <input
            type="range"
            min={3}
            max={360}
            step={1}
            value={tenure}
            onChange={(e) => setTenure(Number(e.target.value))}
          />
        </div>

        <div className="emi-box">
          <p>Your EMI</p>
          <h3>INR {Math.round(calculation.emi).toLocaleString("en-IN")}</h3>
        </div>
      </div>

      <div className="calculator-right">
        <div
          className="donut"
          style={{
            background: `conic-gradient(
              #5dd3c7 ${interestPercent}%,
              #b06fd3 ${interestPercent}% 100%
            )`,
          }}
        >
          <div className="donut-center">
            <p>Total Payable</p>
            <h4>INR {Math.round(calculation.totalPayable).toLocaleString("en-IN")}</h4>
          </div>
        </div>

        <div className="legend">
          <div>
            <span className="dot principal"></span>
            Principal: INR {amount.toLocaleString("en-IN")}
          </div>
          <div>
            <span className="dot interest"></span>
            Interest: INR {Math.round(calculation.interest).toLocaleString("en-IN")}
          </div>
        </div>

        <div className="emi-stat-grid">
          <div className="emi-stat-card">
            <span>Monthly Rate</span>
            <strong>{monthlyRatePercent.toFixed(3)}%</strong>
          </div>
          <div className="emi-stat-card">
            <span>Interest Share</span>
            <strong>{interestPercent.toFixed(1)}%</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoanCalculator;
