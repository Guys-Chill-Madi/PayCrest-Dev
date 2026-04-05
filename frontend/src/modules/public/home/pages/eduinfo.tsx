// Module: eduinfo
import { useState } from "react";
import "../styles/eduinfo.css";
import LoanCalculator from "../../../../components/LoanCalculator";

const EduInfo = () => {
  const [activeTab, setActiveTab] = useState<
    "features" | "eligibility" | "howto"
  >("features");

  return (
    <div className="edu-page">
      <h1 className="edu-title">Education Loan</h1>

      {/* ================= INFO SECTION ================= */}
      <div className="edu-content">
        {/* LEFT MENU */}
        <div className="edu-menu">
          <div
            className={`edu-menu-item ${
              activeTab === "features" ? "active" : ""
            }`}
            onMouseEnter={() => setActiveTab("features")}
          >
            Features
          </div>

          <div
            className={`edu-menu-item ${
              activeTab === "eligibility" ? "active" : ""
            }`}
            onMouseEnter={() => setActiveTab("eligibility")}
          >
            Eligibility
          </div>

          <div
            className={`edu-menu-item ${
              activeTab === "howto" ? "active" : ""
            }`}
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
                <li>Unsecured loan for higher education</li>
                <li>Flexible repayment tenure up to 10 years</li>
                <li>Competitive interest rates starting from 9.5% p.a.</li>
                <li>100% digital and paperless application</li>
                <li>Transparent and fast approval process</li>
                <li>Covers educational expenses in India and abroad</li>
              </ul>
            </>
          )}

          {activeTab === "eligibility" && (
            <>
              <h2>Eligibility Criteria</h2>
              <ul>
                <li>Indian resident with valid PAN</li>
                <li>Confirmed admission from a recognized institution</li>
                <li>Age between 18-40 years</li>
                <li>Valid KYC documentation required</li>
                <li>Parent or guardian as co-applicant</li>
                <li>Minimum annual income of INR 2,50,000</li>
              </ul>
            </>
          )}

          {activeTab === "howto" && (
            <>
              <h2>Application Process</h2>
              <ul>
                <li>Step 1: Register and create your PayCrest account</li>
                <li>Step 2: Complete detailed KYC verification</li>
                <li>Step 3: Check your eligible loan amount</li>
                <li>Step 4: Upload admission and income documents</li>
                <li>Step 5: Submit application for review</li>
                <li>Step 6: Receive approval and fund disbursement</li>
              </ul>
            </>
          )}
        </div>
      </div>

      {/* ================= CALCULATOR SECTION ================= */}
      <div className="edu-calculator">
        <LoanCalculator />
      </div>
    </div>
  );
};

export default EduInfo;


