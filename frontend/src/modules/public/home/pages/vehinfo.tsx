// Module: vehinfo
import { useState } from "react";
import "../styles/eduinfo.css";
import LoanCalculator from "../../../../components/LoanCalculator";

const VehInfo = () => {
  const [activeTab, setActiveTab] = useState<
    "features" | "eligibility" | "howto"
  >("features");

  return (
    <div className="edu-page">
      <h1 className="edu-title">Vehicle Loan</h1>

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
                <li>Fast and hassle-free loan approval</li>
                <li>Flexible EMI plans available</li>
                <li>Competitive interest rates from 8.5% p.a.</li>
                <li>Up to 100% on-road value financing</li>
                <li>Minimal processing fees</li>
                <li>covers new and used vehicles</li>
              </ul>
            </>
          )}

          {activeTab === "eligibility" && (
            <>
              <h2>Eligibility Criteria</h2>
              <ul>
                <li>Indian resident with valid PAN</li>
                <li>Salaried or self-employed with regular income</li>
                <li>Age between 21-60 years</li>
                <li>Valid driving license required</li>
                <li>Good credit and payment history</li>
                <li>Minimum annual income of â‚¹3,00,000</li>
              </ul>
            </>
          )}

          {activeTab === "howto" && (
            <>
              <h2>Application Process</h2>
              <ul>
                <li>Step 1: Choose your vehicle</li>
                <li>Step 2: Check your loan eligibility</li>
                <li>Step 3: Upload income and vehicle documents</li>
                <li>Step 4: Get instant loan approval</li>
                <li>Step 5: Complete verification process</li>
                <li>Step 6: Receive funds for vehicle purchase</li>
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

export default VehInfo;


