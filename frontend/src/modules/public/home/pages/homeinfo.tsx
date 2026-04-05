// Module: homeinfo
import { useState } from "react";
import "../styles/homeinfo.css";
import LoanCalculator from "../../../../components/LoanCalculator";

const HomeInfo = () => {
  const [activeTab, setActiveTab] = useState<
    "features" | "eligibility" | "howto"
  >("features");

  return (
    <div className="edu-page homeinfo-page">
      <h1 className="edu-title">Home Loan</h1>        
      <div className="edu-content">
        {/* LEFT MENU */}
        <div className="edu-menu">
          <div
            className={`edu-menu-item ${activeTab === "features" ? "active" : ""}`}
            onMouseEnter={() => setActiveTab("features")}
          >
            Features
          </div>
          <div
            className={`edu-menu-item ${activeTab === "eligibility" ? "active" : ""}`}
            onMouseEnter={() => setActiveTab("eligibility")}
          >
            Eligibility
          </div>
          <div
            className={`edu-menu-item ${activeTab === "howto" ? "active" : ""}`}
            onMouseEnter={() => setActiveTab("howto")}
          >
            How To Avail
          </div>
        </div>

        {/* RIGHT CONTENT */}
        <div className="edu-details">
          {activeTab === "features" && (
            <>
              <h2>Key Features</h2>
              <ul>
                <li>Competitive interest rates from 8% p.a.</li>
                <li>Flexible repayment up to 30 years</li>
                <li>Balance transfer facility available</li>
                <li>Minimal and digital documentation</li>
                <li>Multiple attractive EMI options</li>
                <li>No hidden charges or processing fees</li>
              </ul>
            </>
          )}

          {activeTab === "eligibility" && (
            <>
              <h2>Eligibility Criteria</h2>
              <ul>
                <li>Indian resident with valid PAN</li>
                <li>Salaried or self-employed individual</li>
                <li>Age between 21-65 years</li>
                <li>Stable income source with verification</li>
                <li>Good credit score (above 700 preferred)</li>
                <li>Clear property documentation and title</li>
              </ul>
            </>
          )}

          {activeTab === "howto" && (
            <>
              <h2>Application Process</h2>
              <ul>
                <li>Step 1: Register with PayCrest and complete KYC</li>
                <li>Step 2: Check eligibility and loan amount</li>
                <li>Step 3: Submit property and income documents</li>
                <li>Step 4: Property valuation and appraisal</li>
                <li>Step 5: Loan approval and documentation</li>
                <li>Step 6: Fund disbursement and property purchase</li>
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

export default HomeInfo;


