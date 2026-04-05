import { useEffect, useMemo, useState } from "react";
import ProgressStep from "../components/ProgressStep";
import ApplicantDetails from "../components/ApplicantDetails";
import { DocumentUpload, getRequiredDocKeys, type UploadedDoc } from "../components/DocumentUpload";
import ReviewSubmit from "../components/ReviewSubmit";
import Confirmation from "../components/Confirmation";
import TrackStatus from "../components/TrackStatus";
import type { TimelineItem } from "../components/TrackStatus";
import { getInterestRateWithOverride, LOAN_CONFIG } from "../components/loanConfig";
import type { LoanType } from "../components/loanConfig";
import { applyEducationLoan, applyHomeLoan, applyPersonalLoan, applyVehicleLoan, getCustomerProfile } from '../../../modules/customer/services/customerApi';
import "../styles/loan-application.css";

interface Props {
  loanType: LoanType;
  offerInterestRate?: number | null;
  offerMinAmount?: number;
  offerMaxAmount?: number;
  offerMinTenure?: number;
  offerMaxTenure?: number;
  onSubmitted?: (payload: {
    loanType: LoanType;
    amount: number;
    tenure: number;
    purpose: string;
    emi: number;
    documents: UploadedDoc[];
  }) => void;
}

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const MASKED_PAN_REGEX = /^[A-Z]{2}\*{6}[0-9][A-Z]$/;
const BANK_REGEX = /^\d{9,18}$/;
const PHONE_REGEX = /^\+?\d{10,15}$/;

type ApplicantForm = {
  full_name: string;
  bank_account_number: string;
  pan_number: string;
  salary_income: string;
  monthly_avg_balance: string;
  guarantor_name: string;
  guarantor_phone: string;
  guarantor_pan: string;
  vehicle_type: "two_wheeler" | "four_wheeler";
  vehicle_model: string;
  property_type: "apartment" | "independent_house" | "villa" | "plot" | "commercial";
  property_address: string;
  property_value: string;
  down_payment: string;
  college_details: string;
  course_details: string;
  collateral: string;
};

type LoanFormDraft = {
  step: number;
  applicant: ApplicantForm;
  loanData: {
    amount: number;
    tenure: number;
    purpose: string;
  };
};

export default function LoanApplication({
  loanType,
  offerInterestRate,
  offerMinAmount,
  offerMaxAmount,
  offerMinTenure,
  offerMaxTenure,
  onSubmitted,
}: Props) {
  const loanTypeLabelMap: Record<LoanType, "Personal" | "Vehicle" | "Education" | "Home"> = {
    personal: "Personal",
    vehicle: "Vehicle",
    education: "Education",
    home: "Home",
  };
  const loanTypeLabel = loanTypeLabelMap[loanType];
  const draftKey = `loan_application_draft_${loanType}`;
  const defaultApplicant: ApplicantForm = {
    full_name: "",
    bank_account_number: "",
    pan_number: "",
    salary_income: "",
    monthly_avg_balance: "",
    guarantor_name: "",
    guarantor_phone: "",
    guarantor_pan: "",
    vehicle_type: "two_wheeler",
    vehicle_model: "",
    property_type: "apartment",
    property_address: "",
    property_value: "",
    down_payment: "",
    college_details: "",
    course_details: "",
    collateral: "",
  };
  const [step, setStep] = useState(1);
  const [showTrackStatus, setShowTrackStatus] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [applicant, setApplicant] = useState<ApplicantForm>(defaultApplicant);

  const loanConfig = LOAN_CONFIG[loanType];
  const minAmount = Math.max(loanConfig.minAmount, offerMinAmount ?? loanConfig.minAmount);
  const maxAmount = Math.max(minAmount, Math.min(loanConfig.maxAmount, offerMaxAmount ?? loanConfig.maxAmount));
  const minTenure = Math.max(loanConfig.minTenure, offerMinTenure ?? loanConfig.minTenure);
  const maxTenure = Math.max(minTenure, Math.min(loanConfig.maxTenure, offerMaxTenure ?? loanConfig.maxTenure));
  const [loanData, setLoanData] = useState({
    amount: minAmount,
    tenure: minTenure,
    purpose: loanConfig.purposes[0],
  });
  const [documents, setDocuments] = useState<UploadedDoc[]>([]);

  useEffect(() => {
    const parseDraft = () => {
      try {
        const raw = localStorage.getItem(draftKey);
        if (!raw) return null;
        return JSON.parse(raw) as LoanFormDraft;
      } catch {
        return null;
      }
    };

    const draft = parseDraft();
    if (draft?.applicant && draft?.loanData) {
      const safeAmount = Math.max(minAmount, Math.min(maxAmount, Number(draft.loanData.amount) || minAmount));
      const safeTenure = Math.max(minTenure, Math.min(maxTenure, Number(draft.loanData.tenure) || minTenure));
      const safePurpose = String(draft.loanData.purpose || LOAN_CONFIG[loanType].purposes[0]);

      setStep(Math.max(1, Math.min(4, Number(draft.step) || 1)));
      setShowTrackStatus(false);
      setMessage(null);
      setLoanData({
        amount: safeAmount,
        tenure: safeTenure,
        purpose: safePurpose,
      });
      setDocuments([]);
      setApplicant({
        ...defaultApplicant,
        ...(draft.applicant as ApplicantForm),
      });
      return;
    }

    setStep(1);
    setShowTrackStatus(false);
    setMessage(null);
    setLoanData({
      amount: minAmount,
      tenure: minTenure,
      purpose: LOAN_CONFIG[loanType].purposes[0],
    });
    setDocuments([]);
    setApplicant(defaultApplicant);
  }, [draftKey, loanType, minAmount, maxAmount, minTenure, maxTenure]);

  useEffect(() => {
    if (step >= 5) return;
    const payload: LoanFormDraft = {
      step,
      applicant,
      loanData,
    };
    localStorage.setItem(draftKey, JSON.stringify(payload));
  }, [draftKey, step, applicant, loanData]);

  useEffect(() => {
    let active = true;
    const hydrate = async () => {
      try {
        const profile = await getCustomerProfile();
        if (!active) return;
        setApplicant((prev) => ({
          ...prev,
          full_name: prev.full_name || profile.name || "",
          bank_account_number: prev.bank_account_number || String(profile.account_number || ""),
          pan_number: prev.pan_number || String(profile.pan_number || ""),
        }));
      } catch {
        // ignore prefill failures
      }
    };
    void hydrate();
    return () => {
      active = false;
    };
  }, []);

  const interestRate = useMemo(
    () => getInterestRateWithOverride(loanType, loanData.amount, offerInterestRate),
    [loanType, loanData.amount, offerInterestRate],
  );
  const monthlyRate = interestRate / 12 / 100;
  const emi = Math.round(
    monthlyRate === 0
      ? loanData.amount / loanData.tenure
      : (loanData.amount * monthlyRate * Math.pow(1 + monthlyRate, loanData.tenure)) /
          (Math.pow(1 + monthlyRate, loanData.tenure) - 1),
  );
  const totalPayable = emi * loanData.tenure;

  const timelineItems: TimelineItem[] = [
    { title: "Application Submitted", time: new Date().toLocaleString(), status: "completed", note: "Application received successfully." },
    { title: "Document Verification", status: "in-progress", note: "Your documents are being verified." },
    { title: "Risk Assessment", status: "pending", note: "Credit assessment starts after verification." },
    { title: "Manager Review", status: "pending", note: "Final approval by lending manager." },
    { title: "Sanction Approved", status: "pending", note: "Sanction letter will be generated." },
  ];

  const handleUploadDocs = (uploaded: UploadedDoc[]) => {
    setDocuments((prev) => {
      const map = new Map(prev.map((d) => [d.key, d]));
      uploaded.forEach((doc) => map.set(doc.key, doc));
      return Array.from(map.values());
    });
  };

  const getMissingRequiredDocs = () => {
    const requiredDocs = getRequiredDocKeys(loanType);
    return requiredDocs.filter((k) => !documents.some((d) => d.key === k && !!d.file));
  };

  const validateApplicant = () => {
    const isGuarantorRequired = loanType === "personal" || loanType === "education";
    if (!applicant.full_name || applicant.full_name.trim().length < 3) return "Full name must be at least 3 characters.";
    if (!BANK_REGEX.test(applicant.bank_account_number.trim())) return "Bank account number must be 9 to 18 digits.";
    const applicantPan = applicant.pan_number.trim().toUpperCase();
    if (!PAN_REGEX.test(applicantPan) && !MASKED_PAN_REGEX.test(applicantPan)) return "PAN format should be like ABCDE1234F.";

    if (loanType !== "education") {
      const salary = Number(applicant.salary_income);
      if (Number.isNaN(salary) || salary < 0 || salary > 10000000) return "Salary income must be between 0 and 10,000,000.";
      const balance = Number(applicant.monthly_avg_balance);
      if (Number.isNaN(balance) || balance < 0) return "Monthly average balance must be a positive number.";
    } else {
      if (!applicant.college_details || applicant.college_details.trim().length < 3) return "College details must be at least 3 characters.";
      if (!applicant.course_details || applicant.course_details.trim().length < 3) return "Course details must be at least 3 characters.";
    }

    if (isGuarantorRequired && applicant.guarantor_name.trim().length < 3) return "Guarantor name must be at least 3 characters.";
    if (isGuarantorRequired && !PHONE_REGEX.test(applicant.guarantor_phone.trim())) return "Guarantor phone must be 10 to 15 digits.";
    if (isGuarantorRequired && !PAN_REGEX.test(applicant.guarantor_pan.trim().toUpperCase()))
      return "Guarantor PAN format should be like ABCDE1234F.";
    if (!isGuarantorRequired && applicant.guarantor_name && applicant.guarantor_name.trim().length < 3)
      return "Guarantor name must be at least 3 characters.";
    if (!isGuarantorRequired && applicant.guarantor_phone && !PHONE_REGEX.test(applicant.guarantor_phone.trim()))
      return "Guarantor phone must be 10 to 15 digits.";
    if (!isGuarantorRequired && applicant.guarantor_pan && !PAN_REGEX.test(applicant.guarantor_pan.trim().toUpperCase()))
      return "Guarantor PAN format should be like ABCDE1234F.";
    if (
      applicant.guarantor_pan &&
      applicant.pan_number &&
      applicant.guarantor_pan.trim().toUpperCase() === applicant.pan_number.trim().toUpperCase()
    )
      return "Guarantor PAN cannot be the same as applicant PAN.";
    if (loanType === "vehicle") {
      if (!applicant.vehicle_model || applicant.vehicle_model.trim().length < 2) return "Vehicle model must be at least 2 characters.";
    }
    if (loanType === "home") {
      if (!applicant.property_address || applicant.property_address.trim().length < 3) return "Property address must be at least 3 characters.";
      const pv = Number(applicant.property_value);
      if (Number.isNaN(pv) || pv <= 0) return "Property value must be a positive number.";
      const dp = Number(applicant.down_payment);
      if (Number.isNaN(dp) || dp < 0) return "Down payment must be a valid number.";
    }
    return null;
  };

  const validateLoanDetails = () => {
    if (!loanData.purpose || loanData.purpose.trim().length < 5) return "Loan purpose must be at least 5 characters.";
    if (loanData.amount < minAmount || loanData.amount > maxAmount) return "Loan amount must be within allowed limits.";
    if (loanData.tenure < minTenure || loanData.tenure > maxTenure) return "Tenure must be within allowed limits.";
    return null;
  };

  const next = () => {
    setMessage(null);
    if (step === 1) {
      const error = validateApplicant();
      if (error) {
        setMessage({ type: "error", text: error });
        return;
      }
    }
    if (step === 2) {
      const error = validateLoanDetails();
      if (error) {
        setMessage({ type: "error", text: error });
        return;
      }
    }
    if (step === 3) {
      const missing = getMissingRequiredDocs();
      if (missing.length) {
        setMessage({ type: "error", text: "Please upload all required documents before continuing." });
        return;
      }
    }
    setStep((s) => Math.min(s + 1, 5));
  };
  const back = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmitApplication = async () => {
    const applicantError = validateApplicant();
    const loanError = validateLoanDetails();
    if (applicantError || loanError) {
      setMessage({ type: "error", text: applicantError || loanError || "Please check the form fields." });
      return;
    }
    setMessage(null);
    if (submitting) return;
    setSubmitting(true);
    try {
      const missing = getMissingRequiredDocs();
      if (missing.length) {
        setMessage({ type: "error", text: "Please upload all required documents before submitting." });
        setSubmitting(false);
        return;
      }

      const formData = new FormData();
      formData.append("bank_account_number", applicant.bank_account_number.trim());
      formData.append("full_name", applicant.full_name.trim());
      const applicantPan = applicant.pan_number.trim().toUpperCase();
      if (PAN_REGEX.test(applicantPan)) {
        formData.append("pan_number", applicantPan);
      }
      formData.append("loan_amount", String(loanData.amount));
      formData.append("tenure_months", String(loanData.tenure));

      if (loanType === "education") {
        formData.append("college_details", applicant.college_details.trim());
        formData.append("course_details", applicant.course_details.trim());
        if (applicant.collateral) formData.append("collateral", applicant.collateral.trim());
      } else {
        formData.append("loan_purpose", loanData.purpose.trim());
        formData.append("salary_income", String(applicant.salary_income));
        formData.append("monthly_avg_balance", String(applicant.monthly_avg_balance));
      }

      if (applicant.guarantor_name) formData.append("guarantor_name", applicant.guarantor_name.trim());
      if (applicant.guarantor_phone) formData.append("guarantor_phone", applicant.guarantor_phone.trim());
      if (applicant.guarantor_pan) formData.append("guarantor_pan", applicant.guarantor_pan.trim().toUpperCase());
      if (loanType === "vehicle") {
        formData.append("vehicle_type", applicant.vehicle_type);
        formData.append("vehicle_model", applicant.vehicle_model.trim());
      }
      if (loanType === "home") {
        formData.append("property_type", applicant.property_type);
        formData.append("property_address", applicant.property_address.trim());
        formData.append("property_value", String(applicant.property_value));
        formData.append("down_payment", String(applicant.down_payment));
      }
      documents.forEach((doc) => {
        if (doc.file) formData.append(doc.key, doc.file);
      });

      if (loanType === "vehicle") await applyVehicleLoan(formData);
      else if (loanType === "education") await applyEducationLoan(formData);
      else if (loanType === "home") await applyHomeLoan(formData);
      else await applyPersonalLoan(formData);

      onSubmitted?.({
        loanType,
        amount: loanData.amount,
        tenure: loanData.tenure,
        purpose: loanData.purpose,
        emi,
        documents,
      });
      localStorage.removeItem(draftKey);
      setMessage({ type: "success", text: "Application submitted successfully." });
      setStep(5);
    } catch (err) {
      const text = err instanceof Error ? err.message : "Loan application failed";
      setMessage({ type: "error", text });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="loan-wrapper">
      <div className="loan-container">
        <div className="loan-flow-header">
          <h2>{loanTypeLabel} Loan Application</h2>
          <span className={`loan-type-badge ${loanTypeLabel}`}>{loanTypeLabel} Loan</span>
        </div>
        <ProgressStep step={step} />

        {message && <div className={`form-message ${message.type}`}>{message.text}</div>}

        {step === 1 && <ApplicantDetails loanType={loanType} applicant={applicant} onChange={setApplicant} />}

        {step === 2 && (
          <div className="step-card">
            <h3>Loan Details</h3>
            <div className="form-group">
              <label>Loan Amount</label>
              <input
                type="number"
                min={minAmount}
                max={maxAmount}
                step={loanConfig.amountStep}
                value={loanData.amount}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (!raw) {
                    setLoanData({ ...loanData, amount: minAmount });
                    return;
                  }
                  const parsed = Number.parseInt(raw, 10);
                  if (Number.isNaN(parsed)) return;
                  const normalized = Math.max(minAmount, Math.min(maxAmount, parsed));
                  setLoanData({ ...loanData, amount: normalized });
                }}
              />
            </div>

            <div className="form-group">
              <label>Loan Tenure</label>
              <select value={loanData.tenure} onChange={(e) => setLoanData({ ...loanData, tenure: Number(e.target.value) })}>
                {Array.from(
                  { length: Math.floor((maxTenure - minTenure) / loanConfig.tenureStep) + 1 },
                  (_, index) => minTenure + index * loanConfig.tenureStep,
                ).map((months) => (
                  <option key={months} value={months}>
                    {months} Months
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Purpose</label>
              <select value={loanData.purpose} onChange={(e) => setLoanData({ ...loanData, purpose: e.target.value })}>
                {loanConfig.purposes.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="emi-card loan-application-emi-box">
              <div className="emi-row">
                <span>Selected Rate</span>
                <strong>{interestRate.toFixed(2)}% p.a.</strong>
              </div>
              <div className="emi-row">
                <span>Total Payable</span>
                <strong>INR {totalPayable.toLocaleString("en-IN")}</strong>
              </div>
              <div className="emi-row highlight">
                <span>Estimated EMI</span>
                <strong>INR {emi.toLocaleString("en-IN")} / month</strong>
              </div>
            </div>
          </div>
        )}

        {step === 3 && <DocumentUpload loanType={loanType} onUpload={handleUploadDocs} />}

        {step === 4 && (
          <ReviewSubmit
            loan={loanData}
            documents={documents}
            emi={emi}
            onBack={back}
            onSubmit={handleSubmitApplication}
            submitting={submitting}
          />
        )}

        {step === 5 && !showTrackStatus && <Confirmation onTrackStatus={() => setShowTrackStatus(true)} />}
        {step === 5 && showTrackStatus && (
          <TrackStatus
            items={timelineItems}
            sanctionLetter={{
              isAvailable: false,
              fileName: "sanction-letter.txt",
              fileContent: "Pending approval",
              fileMimeType: "text/plain",
            }}
            onBack={() => setShowTrackStatus(false)}
            backLabel="Back to Confirmation"
          />
        )}

        {step < 4 && (
          <div className="button-row">
            {step > 1 && (
              <button className="btn-outline" onClick={back}>
                Back
              </button>
            )}
            <button className="btn-primary" onClick={next}>
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


