// Module: persinfo
import { useState } from "react";
import "../styles/eduinfo.css";
import LoanCalculator from "../../../../components/LoanCalculator";

const PersInfo = () => {
  const [activeTab, setActiveTab] = useState<
    "features" | "eligibility" | "howto"
  >("features");

  return (
    <div className="edu-page">
      <h1 className="edu-title">Personal Loan</h1>

      <div className="edu-content">
        <div className="edu-menu">
          <div className={`edu-menu-item ${activeTab === "features" ? "active" : ""}`}
            onMouseEnter={() => setActiveTab("features")}>
            Features
          </div>
          <div className={`edu-menu-item ${activeTab === "eligibility" ? "active" : ""}`}
            onMouseEnter={() => setActiveTab("eligibility")}>
            Eligibility
          </div>
          <div className={`edu-menu-item ${activeTab === "howto" ? "active" : ""}`}
            onMouseEnter={() => setActiveTab("howto")}>
            How To Avail
          </div>
        </div>

        <div className="edu-details">
          {activeTab === "features" && (
            <>
              <h2>Key Features</h2>
              <ul>
                <li>Unsecured and collateral-free loan</li>
                <li>Instant disbursement of funds</li>
                <li>Flexible repayment tenure up to 5 years</li>
                <li>Minimal documentation required</li>
                <li>Competitive interest rates from 9% p.a.</li>
                <li>Use funds for any personal purpose</li>
              </ul>
            </>
          )}

          {activeTab === "eligibility" && (
            <>
              <h2>Eligibility Criteria</h2>
              <ul>
                <li>Age between 21-60 years</li>
                <li>Stable monthly income</li>
                <li>Valid PAN and KYC documents</li>
                <li>Good credit score (above 650)</li>
                <li>Minimum annual income of â‚¹2,00,000</li>
                <li>Indian resident with valid ID proof</li>
              </ul>
            </>
          )}

          {activeTab === "howto" && (
            <>
              <h2>Application Process</h2>
              <ul>
                <li>Step 1: Register on PayCrest platform</li>
                <li>Step 2: Complete KYC verification</li>
                <li>Step 3: Submit financial documents</li>
                <li>Step 4: Get instant loan quotation</li>
                <li>Step 5: Accept loan offer and sign agreement</li>
                <li>Step 6: Receive funds directly in your account</li>
              </ul>
            </>
          )}
        </div>
      </div>

      <div className="edu-calculator">
        <LoanCalculator />
      </div>
    </div>
  );
};

export default PersInfo;


