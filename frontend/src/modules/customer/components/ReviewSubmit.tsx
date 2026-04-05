import { useState } from "react";

import type { UploadedDoc } from "./DocumentUpload";

interface Props {
  loan: {
    amount: number;
    tenure: number;
    purpose: string;
  };
  documents: UploadedDoc[];
  emi: number;
  onBack: () => void;
  onSubmit: () => void;
  submitting?: boolean;
}

export default function ReviewSubmit({
  loan,
  documents,
  emi,
  onBack,
  onSubmit,
  submitting = false,
}: Props) {
  const [confirmInfo, setConfirmInfo] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [authorizeCheck, setAuthorizeCheck] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const isSubmitEnabled = confirmInfo && agreeTerms && authorizeCheck && !submitting;
  const handleTermsCheckboxChange = (checked: boolean) => {
    if (!checked) {
      setAgreeTerms(false);
      return;
    }

    setShowTermsModal(true);
  };

  const handleAgreeTerms = () => {
    setAgreeTerms(true);
    setShowTermsModal(false);
  };

  if (!loan) return null;

  return (
    <div className="review-wrapper">
      <div className="review-card">
        <h3 className="card-title">Loan Summary</h3>

        <div className="summary-row">
          <span>Loan Amount</span>
          <strong>INR {loan.amount.toLocaleString()}</strong>
        </div>

        <div className="summary-row">
          <span>Tenure</span>
          <strong>{loan.tenure} months</strong>
        </div>

        <div className="summary-row">
          <span>Purpose</span>
          <strong>{loan.purpose}</strong>
        </div>

        <div className="summary-row highlight">
          <span>Estimated EMI</span>
          <strong>INR {emi} / month</strong>
        </div>
      </div>

      <div className="review-card">
        <h3 className="card-title">Documents Uploaded</h3>

        {documents.length === 0 ? (
          <p className="muted-text">No documents uploaded</p>
        ) : (
          <ul className="doc-list">
            {documents.map((doc) => (
              <li key={doc.key}>Done: {doc.label}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="review-card">
        <h3 className="card-title">Declarations</h3>

        <label className="declaration-row">
          <input
            type="checkbox"
            checked={confirmInfo}
            onChange={(e) => setConfirmInfo(e.target.checked)}
          />
          <span>I confirm the information provided is correct</span>
        </label>

        <label className="declaration-row">
          <input
            type="checkbox"
            checked={agreeTerms}
            onChange={(e) => handleTermsCheckboxChange(e.target.checked)}
          />
          <span>I agree to the Terms & Conditions</span>
        </label>

        <label className="declaration-row">
          <input
            type="checkbox"
            checked={authorizeCheck}
            onChange={(e) => setAuthorizeCheck(e.target.checked)}
          />
          <span>I authorize credit and document verification</span>
        </label>
      </div>

      <div className="action-bar">
        <button className="btn-outline" onClick={onBack}>
          Back
        </button>

        <button
          className={`btn-primary ${!isSubmitEnabled ? "disabled" : ""}`}
          disabled={!isSubmitEnabled}
          onClick={onSubmit}
        >
          {submitting ? "Submitting..." : "Submit Application"}
        </button>
      </div>

      {showTermsModal ? (
        <div className="terms-modal-overlay">
          <div
            className="terms-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="terms-modal-title"
          >
            <h3 id="terms-modal-title" className="terms-modal-title">
              Terms of Service & Customer Agreement
            </h3>
            <p className="terms-modal-subtitle">
              Mandatory acceptance before loan processing.
            </p>

            <div className="terms-modal-content">
              <h4>1. Introduction</h4>
              <p>
                This agreement governs the use of the loan services provided by
                [Company/Bank/NBFC Name]. By applying or accepting the loan facility,
                you agree to be bound by these terms, applicable laws, digital consent
                regulations, and credit reporting requirements.
              </p>

              <h4>2. Eligibility & Customer Responsibility</h4>
              <p>
                You confirm that all information submitted is accurate and that you are
                applying voluntarily. You are responsible for account usage and
                confidentiality of login credentials, OTPs, and account details.
              </p>

              <h4>3. Loan Usage & Restrictions</h4>
              <p>
                The loan amount must be used only for the purpose mentioned in the
                application. Illegal or unauthorized usage is prohibited.
              </p>

              <h4>4. Repayment & Financial Obligations</h4>
              <p>
                You agree to repay EMIs, applicable interest, charges, late fees, and
                penalties. Default may affect your credit score and trigger recovery
                actions under law.
              </p>

              <h4>5. Digital Consent & Communication</h4>
              <p>
                You consent to digital documentation, OTP-based authentication, and
                communication via SMS, email, phone calls, or in-app notifications.
              </p>

              <h4>6. Credit Bureau Authorization</h4>
              <p>
                You authorize credit information checks and reporting to authorized
                credit bureaus and institutions.
              </p>

              <h4>7. Data Usage & Privacy</h4>
              <p>
                Your data may be processed for risk assessment, fraud prevention,
                compliance, and service improvement in line with privacy rules.
              </p>

              <h4>8. Default & Recovery</h4>
              <p>
                In case of default, penalties, bureau reporting, and legal recovery
                actions may be initiated through registered communication channels.
              </p>

              <h4>9. Changes to Terms</h4>
              <p>
                Terms, policies, and service conditions may be updated as per
                regulatory and operational requirements.
              </p>
            </div>

            <div className="terms-modal-actions">
              <button type="button" className="btn-outline" onClick={() => setShowTermsModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={handleAgreeTerms}>
                I Agree & Continue
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

