// Module: KYC
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../../styles/customerLogin.css";
import { maskAadhaar, maskPan } from "../../../lib/masking";
import { getSession } from "../../../modules/auth/services/authApi";
import { getCustomerKycDetails, submitKyc } from "../../../modules/customer/services/customerApi";
import DataState from "../../../components/ui/DataState";

// KYC form: collects documents and personal details and stores into the customer's record
const KYC = () => {
  const navigate = useNavigate();
  const logoSrc = new URL("../../../styles/paycrest-logo.png", import.meta.url).href;
  const [form, setForm] = useState({
    full_name: "",
    dob: "",
    nationality: "",
    gender: "",
    father_or_spouse_name: "",
    marital_status: "",
    phone_number: "",
    pan_number: "",
    aadhaar_number: "",
    employment_status: "",
    employment_type: "",
    company_name: "",
    monthly_income: "",
    existing_emi_months: "",
    years_of_experience: "",
    address: "",
    pan_file: null as File | null,
    aadhaar_file: null as File | null,
    photo_file: null as File | null,
  });
  const [message, setMessage] = useState<{ type: "error" | "success" | "info"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [prefillLoading, setPrefillLoading] = useState(false);
  const [hasExistingKyc, setHasExistingKyc] = useState(false);
  const [kycDocStatus, setKycDocStatus] = useState({ pan: false, aadhaar: false, photo: false });
  const [photoPreview, setPhotoPreview] = useState("");
  const panFileRef = useRef<HTMLInputElement | null>(null);
  const aadhaarFileRef = useRef<HTMLInputElement | null>(null);
  const photoFileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== "customer") {
      navigate("/login/customer");
      return;
    }

    void (async () => {
      setPrefillLoading(true);
      try {
        const kyc = await getCustomerKycDetails();
        if (!kyc || typeof kyc !== "object") return;
        setHasExistingKyc(true);
        setForm((s) => ({
          ...s,
          full_name: String(kyc.full_name || s.full_name || ""),
          dob: String(kyc.dob || s.dob || ""),
          nationality: String(kyc.nationality || s.nationality || ""),
          gender: String(kyc.gender || s.gender || ""),
          father_or_spouse_name: String(kyc.father_or_spouse_name || s.father_or_spouse_name || ""),
          marital_status: String(kyc.marital_status || s.marital_status || ""),
          phone_number: String(kyc.phone_number || s.phone_number || ""),
          pan_number: String(kyc.pan_masked || (kyc.pan_number ? maskPan(kyc.pan_number) : s.pan_number || "")),
          aadhaar_number: String(kyc.aadhaar_masked || (kyc.aadhaar_number ? maskAadhaar(kyc.aadhaar_number) : s.aadhaar_number || "")),
          employment_status: String(kyc.employment_status || s.employment_status || ""),
          employment_type: String(kyc.employment_type || s.employment_type || ""),
          company_name: String(kyc.company_name || s.company_name || ""),
          monthly_income: kyc.monthly_income != null ? String(kyc.monthly_income) : s.monthly_income,
          existing_emi_months: kyc.existing_emi_months != null ? String(kyc.existing_emi_months) : s.existing_emi_months,
          years_of_experience: kyc.years_of_experience != null ? String(kyc.years_of_experience) : s.years_of_experience,
          address: String(kyc.address || s.address || ""),
        }));
        setKycDocStatus({
          pan: Boolean(kyc.pan_card),
          aadhaar: Boolean(kyc.aadhar_card || kyc.aadhaar_card),
          photo: Boolean(kyc.photo),
        });
      } catch (err) {
        const status = Number((err as any)?.status || (err as any)?.response?.status || 0);
        if (status !== 404) {
          setMessage({ type: "info", text: "Could not load previous KYC details. You can still continue." });
        }
      } finally {
        setPrefillLoading(false);
      }
    })();
  }, [navigate]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>, key: "pan_file" | "aadhaar_file" | "photo_file") => {
    const file = e.target.files?.[0] || null;
    setForm((s) => ({ ...s, [key]: file }));
  };

  const clearFile = (key: "pan_file" | "aadhaar_file" | "photo_file") => {
    setForm((s) => ({ ...s, [key]: null }));
    const ref = key === "pan_file" ? panFileRef : key === "aadhaar_file" ? aadhaarFileRef : photoFileRef;
    if (ref.current) ref.current.value = "";
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setMessage(null);
    const session = getSession();
    if (!session) return navigate("/login/customer");

    // minimal required fields
    const normalizedPhone = form.phone_number ? String(form.phone_number).replace(/\s+/g, "") : "";
    const normalizedAadhaar = form.aadhaar_number ? String(form.aadhaar_number).replace(/\s+/g, "") : "";
    const normalizedPan = form.pan_number ? String(form.pan_number).trim().toUpperCase() : "";
    const normalizedAddress = form.address ? form.address.trim() : "";

    if (!form.full_name || !form.dob || !form.nationality || !normalizedPhone || !normalizedAddress || (!isRestrictedUpdate && (!normalizedPan || !normalizedAadhaar))) {
      setMessage({ type: "error", text: "Please fill required fields: full name, DOB, nationality, phone number, address, PAN, Aadhaar." });
      return;
    }
    const hasPanOnFile = Boolean(form.pan_file || kycDocStatus.pan);
    const hasAadhaarOnFile = Boolean(form.aadhaar_file || kycDocStatus.aadhaar);
    if (!hasPanOnFile || !hasAadhaarOnFile) {
      setMessage({ type: "error", text: "Please upload PAN and Aadhaar documents (PDF) before submitting." });
      return;
    }
    if (form.pan_file && form.pan_file.type && form.pan_file.type !== "application/pdf") {
      setMessage({ type: "error", text: "PAN document must be a PDF file." });
      return;
    }
    if (form.aadhaar_file && form.aadhaar_file.type && form.aadhaar_file.type !== "application/pdf") {
      setMessage({ type: "error", text: "Aadhaar document must be a PDF file." });
      return;
    }
    if (form.full_name.trim().length < 3) {
      setMessage({ type: "error", text: "Full name must be at least 3 characters." });
      return;
    }
    if (form.nationality.trim().length < 3) {
      setMessage({ type: "error", text: "Nationality must be at least 3 characters." });
      return;
    }
    if (!isRestrictedUpdate && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(normalizedPan)) {
      setMessage({ type: "error", text: "PAN format should be like ABCDE1234F." });
      return;
    }
    if (!isRestrictedUpdate && !/^\d{12}$/.test(normalizedAadhaar)) {
      setMessage({ type: "error", text: "Aadhaar number must be exactly 12 digits." });
      return;
    }
    if (!/^\+?\d{10,15}$/.test(normalizedPhone)) {
      setMessage({ type: "error", text: "Phone number must be 10 to 15 digits (optional +)." });
      return;
    }
    if (form.father_or_spouse_name && form.father_or_spouse_name.trim().length < 3) {
      setMessage({ type: "error", text: "Father/Spouse name must be at least 3 characters." });
      return;
    }
    if (form.company_name && form.company_name.trim().length < 2) {
      setMessage({ type: "error", text: "Company name must be at least 2 characters." });
      return;
    }
    if (normalizedAddress.length < 10) {
      setMessage({ type: "error", text: "Address must be at least 10 characters." });
      return;
    }
    if (form.monthly_income && Number(form.monthly_income) > 10000000) {
      setMessage({ type: "error", text: "Monthly income must be less than or equal to 10,000,000." });
      return;
    }
    if (form.existing_emi_months && Number(form.existing_emi_months) > 360) {
      setMessage({ type: "error", text: "Existing EMI months must be between 0 and 360." });
      return;
    }
    if (form.years_of_experience && Number(form.years_of_experience) > 60) {
      setMessage({ type: "error", text: "Years of experience must be between 0 and 60." });
      return;
    }

    const formData = new FormData();
    formData.append("full_name", form.full_name);
    formData.append("dob", form.dob);
    formData.append("nationality", form.nationality);
    if (form.gender) formData.append("gender", form.gender);
    if (form.father_or_spouse_name) formData.append("father_or_spouse_name", form.father_or_spouse_name);
    if (form.marital_status) formData.append("marital_status", form.marital_status);
    formData.append("phone_number", normalizedPhone);
    if (!isRestrictedUpdate && normalizedPan) formData.append("pan_number", normalizedPan);
    if (!isRestrictedUpdate && normalizedAadhaar) formData.append("aadhaar_number", normalizedAadhaar);
    if (form.employment_status) formData.append("employment_status", form.employment_status);
    if (form.employment_type) formData.append("employment_type", form.employment_type);
    if (form.company_name) formData.append("company_name", form.company_name);
    if (form.monthly_income) formData.append("monthly_income", String(form.monthly_income));
    if (form.existing_emi_months) formData.append("existing_emi_months", String(form.existing_emi_months));
    if (form.years_of_experience) formData.append("years_of_experience", String(form.years_of_experience));
    formData.append("address", normalizedAddress);
    if (form.pan_file) formData.append("pan_card", form.pan_file);
    if (form.aadhaar_file) formData.append("aadhar_card", form.aadhaar_file);
    if (form.photo_file) formData.append("photo", form.photo_file);

    try {
      setLoading(true);
      await submitKyc(formData);
      setMessage({ type: "success", text: "KYC submitted successfully. Status: Pending review. Redirecting..." });
      window.setTimeout(() => navigate("/dashboard"), 600);
    } catch (err) {
      let text = "KYC submission failed";
      const e = err as any;
      if (e?.response) {
        const resp = e.response;
        if (resp.detail && resp.detail.details) {
          const details = Object.entries(resp.detail.details || {})
            .map(([k, v]) => `${k}: ${v}`)
            .join("\n");
          text = `${resp.detail.error || "KYC validation failed"}\n${details}`;
        } else if (resp.detail) {
          text = typeof resp.detail === "string" ? resp.detail : JSON.stringify(resp.detail);
        } else if (resp.message) {
          text = String(resp.message);
        }
      } else if (err instanceof Error) {
        text = err.message;
      }
      setMessage({ type: "error", text });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!form.photo_file) {
      setPhotoPreview("");
      return;
    }
    const url = URL.createObjectURL(form.photo_file);
    setPhotoPreview(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [form.photo_file]);

  const completion = (() => {
    const personal = Number(Boolean(form.full_name && form.dob && form.nationality));
    const identity = Number(Boolean(form.pan_number && form.aadhaar_number && form.pan_file && form.aadhaar_file));
    const employment = Number(Boolean(form.employment_status || form.company_name || form.monthly_income));
    const address = Number(Boolean(form.address));
    const total = personal + identity + employment + address;
    return { total, percent: Math.round((total / 4) * 100) };
  })();

  const isRestrictedUpdate = hasExistingKyc;
  const isErrorMessage = message?.type === "error";

  return (
    <div className="customer-page kyc-page">
      <div className="kyc-container fade-in">
        <div className="kyc-header">
          <div>
            <div className="form-brand kyc-brand">
              <img src={logoSrc} alt="PayCrest" />
              <span>PayCrest</span>
            </div>
            <h2>KYC Verification</h2>
            <p>Complete your profile once to unlock loan applications.</p>
          </div>
          <div className="kyc-badge">Secure</div>
        </div>

        <div className="kyc-progress-wrap">
          <div className="kyc-progress-bar">
            <span className="kyc-progress-bar__fill" style={{ width: `${completion.percent}%` }} />
          </div>
          <div className="kyc-progress-value-row">
            <span className="muted">{completion.percent}%</span>
          </div>
        </div>

        <form className="kyc-form" onSubmit={handleSubmit}>
          {isRestrictedUpdate ? (
            <div className="form-message" style={{ marginBottom: 12 }}>
              Only <strong>phone number</strong>, <strong>address</strong>, and <strong>employment & income</strong> fields can be updated. Other details are shown as locked.
            </div>
          ) : null}
          <section className="kyc-section">
            <h3>Personal Details</h3>
            <div className="kyc-grid">
              <div className="kyc-field">
                <label htmlFor="full_name">Full Name *</label>
                <input id="full_name" name="full_name" value={form.full_name} onChange={handleChange} placeholder="Full name" required readOnly={isRestrictedUpdate} />
              </div>
              <div className="kyc-field">
                <label htmlFor="dob">Date of Birth *</label>
                <input id="dob" name="dob" type="date" value={form.dob} onChange={handleChange} required readOnly={isRestrictedUpdate} />
              </div>
              <div className="kyc-field">
                <label htmlFor="nationality">Nationality *</label>
                <input id="nationality" name="nationality" value={form.nationality} onChange={handleChange} placeholder="Nationality" required readOnly={isRestrictedUpdate} />
              </div>
              <div className="kyc-field kyc-upload">
                <label>Upload Photo</label>
                {isRestrictedUpdate ? (
                  <div className="muted">{kycDocStatus.photo ? "Photo already on file" : "Photo not on file"}</div>
                ) : (
                  <>
                    <input ref={photoFileRef} type="file" accept="image/*" onChange={(e) => handleFile(e, "photo_file")} />
                    {photoPreview && <img className="preview-image" src={photoPreview} alt="Photo preview" />}
                    {form.photo_file && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 8 }}>
                        <div className="muted" style={{ overflow: "hidden", textOverflow: "ellipsis" }} title={form.photo_file.name}>
                          {form.photo_file.name}
                        </div>
                        <button type="button" className="kyc-clear-btn" onClick={() => clearFile("photo_file")} disabled={loading}>
                          Clear
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="kyc-field">
                <label htmlFor="gender">Gender</label>
                <select id="gender" name="gender" value={form.gender} onChange={handleChange} disabled={isRestrictedUpdate}>
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="kyc-field">
                <label htmlFor="father_or_spouse_name">Father/Spouse Name</label>
                <input id="father_or_spouse_name" name="father_or_spouse_name" value={form.father_or_spouse_name} onChange={handleChange} placeholder="Father/Spouse name" readOnly={isRestrictedUpdate} />
              </div>
              <div className="kyc-field">
                <label htmlFor="marital_status">Marital Status</label>
                <select id="marital_status" name="marital_status" value={form.marital_status} onChange={handleChange} disabled={isRestrictedUpdate}>
                  <option value="">Select status</option>
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="divorced">Divorced</option>
                  <option value="widowed">Widowed</option>
                </select>
              </div>
              <div className="kyc-field">
                <label htmlFor="phone_number">Phone Number <span className="required-star">*</span></label>
                <input
                  id="phone_number"
                  name="phone_number"
                  type="tel"
                  value={form.phone_number}
                  onChange={handleChange}
                  placeholder="+919876543210"
                  pattern="^[+]?[0-9]{10,15}$"
                  title="Use 10 to 15 digits, optional leading + (e.g. +919876543210 or 9876543210)"
                  required
                />
                <div className="muted">Example: `+919876543210` or `9876543210`</div>
              </div>
            </div>
          </section>

          <section className="kyc-section">
            <h3>Identity Documents</h3>
            <div className="kyc-grid">
              <div className="kyc-field">
                <label htmlFor="pan_number">PAN Number *</label>
                <input id="pan_number" name="pan_number" value={form.pan_number} onChange={handleChange} placeholder="PAN number" required={!isRestrictedUpdate} pattern={isRestrictedUpdate ? undefined : "^[A-Z]{5}[0-9]{4}[A-Z]$"} readOnly={isRestrictedUpdate} />
              </div>
              <div className="kyc-field">
                <label htmlFor="aadhaar_number">Aadhaar Number *</label>
                <input id="aadhaar_number" name="aadhaar_number" value={form.aadhaar_number} onChange={handleChange} placeholder="Aadhaar number" required={!isRestrictedUpdate} pattern={isRestrictedUpdate ? undefined : "^[0-9]{12}$"} readOnly={isRestrictedUpdate} />
              </div>
              <div className="kyc-field kyc-upload">
                <label>Upload PAN (PDF) *</label>
                {isRestrictedUpdate ? (
                  <div className="muted">{kycDocStatus.pan ? "PAN document already on file" : "PAN document not on file"}</div>
                ) : (
                  <>
                    <input ref={panFileRef} type="file" accept="application/pdf" onChange={(e) => handleFile(e, "pan_file")} required />
                    {form.pan_file && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 8 }}>
                        <div className="muted" style={{ overflow: "hidden", textOverflow: "ellipsis" }} title={form.pan_file.name}>
                          {form.pan_file.name}
                        </div>
                        <button type="button" className="kyc-clear-btn" onClick={() => clearFile("pan_file")} disabled={loading}>
                          Clear
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="kyc-field kyc-upload">
                <label>Upload Aadhaar (PDF) *</label>
                {isRestrictedUpdate ? (
                  <div className="muted">{kycDocStatus.aadhaar ? "Aadhaar document already on file" : "Aadhaar document not on file"}</div>
                ) : (
                  <>
                    <input ref={aadhaarFileRef} type="file" accept="application/pdf" onChange={(e) => handleFile(e, "aadhaar_file")} required />
                    {form.aadhaar_file && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 8 }}>
                        <div className="muted" style={{ overflow: "hidden", textOverflow: "ellipsis" }} title={form.aadhaar_file.name}>
                          {form.aadhaar_file.name}
                        </div>
                        <button type="button" className="kyc-clear-btn" onClick={() => clearFile("aadhaar_file")} disabled={loading}>
                          Clear
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </section>

          <section className="kyc-section">
            <h3>Employment & Income</h3>
            <div className="kyc-grid">
              <div className="kyc-field">
                <label htmlFor="employment_status">Employment Status</label>
                <select id="employment_status" name="employment_status" value={form.employment_status} onChange={handleChange}>
                  <option value="">Select status</option>
                  <option value="employed">Employed</option>
                  <option value="self-employed">Self-employed</option>
                  <option value="unemployed">Unemployed</option>
                  <option value="student">Student</option>
                  <option value="retired">Retired</option>
                </select>
              </div>
              <div className="kyc-field">
                <label htmlFor="employment_type">Employment Type</label>
                <select id="employment_type" name="employment_type" value={form.employment_type} onChange={handleChange}>
                  <option value="">Select type</option>
                  <option value="private">Private</option>
                  <option value="government">Government</option>
                  <option value="business">Business</option>
                  <option value="freelancer">Freelancer</option>
                </select>
              </div>
              <div className="kyc-field">
                <label htmlFor="company_name">Company Name</label>
                <input id="company_name" name="company_name" value={form.company_name} onChange={handleChange} placeholder="Company name" />
              </div>
              <div className="kyc-field">
                <label htmlFor="monthly_income">Monthly Income</label>
                <input id="monthly_income" name="monthly_income" type="number" value={form.monthly_income} onChange={handleChange} placeholder="Monthly income" min={0} />
              </div>
              <div className="kyc-field">
                <label htmlFor="existing_emi_months">Existing EMI months</label>
                <input id="existing_emi_months" name="existing_emi_months" type="number" value={form.existing_emi_months} onChange={handleChange} placeholder="Existing EMI months" min={0} max={360} />
              </div>
              <div className="kyc-field">
                <label htmlFor="years_of_experience">Years of Experience</label>
                <input id="years_of_experience" name="years_of_experience" type="number" value={form.years_of_experience} onChange={handleChange} placeholder="Years of experience" min={0} max={60} />
              </div>
            </div>
          </section>

          <section className="kyc-section">
            <h3>Address</h3>
            <div className="kyc-grid">
              <div className="kyc-field kyc-full">
                <label htmlFor="address">Address <span className="required-star">*</span></label>
                <textarea id="address" name="address" value={form.address} onChange={handleChange} placeholder="Full address" rows={3} required />
              </div>
            </div>
          </section>

          <div className="kyc-actions">
            <button type="submit" disabled={loading || prefillLoading}>{loading ? "Submitting..." : isRestrictedUpdate ? "Update KYC" : "Submit KYC"}</button>
          </div>
        </form>
        {message ? (
          <div className={isErrorMessage ? "kyc-feedback-overlay" : "kyc-feedback-inline"}>
            <div className={isErrorMessage ? "kyc-feedback-card" : undefined}>
              <DataState
                variant={message.type === "success" ? "success" : message.type === "info" ? "loading" : "error"}
                title={message.type === "success" ? "KYC submitted" : "KYC update required"}
                message={message.text}
                ctaLabel="Dismiss"
                onCta={() => setMessage(null)}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default KYC;



