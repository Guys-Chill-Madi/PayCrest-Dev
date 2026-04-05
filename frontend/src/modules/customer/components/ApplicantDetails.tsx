interface Props {
  applicant: {
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
  onChange: (data: any) => void;
  loanType: "personal" | "vehicle" | "education" | "home";
}

export default function ApplicantDetails({ applicant, onChange, loanType }: Props) {
  const isGuarantorRequired = loanType === "personal" || loanType === "education";
  const normalizeNumberInput = (value: string) => {
    const digitsOnly = value.replace(/[^\d]/g, "");
    if (!digitsOnly) return "";
    return digitsOnly.replace(/^0+(?=\d)/, "");
  };
  const requiredLabel = (label: string) => (
    <>
      {label}
      <span className="required-star" aria-hidden="true">
        *
      </span>
    </>
  );

  return (
    <div className="step-card">
      <h3>Applicant & Bank Details</h3>

      <div className="form-group">
        <label>{requiredLabel("Full Name")}</label>
        <input
          value={applicant.full_name}
          onChange={(e) => onChange({ ...applicant, full_name: e.target.value })}
          placeholder="Registered full name"
          maxLength={100}
          required
        />
      </div>

      <div className="form-group">
        <label>{requiredLabel("Bank Account Number")}</label>
        <input
          value={applicant.bank_account_number}
          onChange={(e) => onChange({ ...applicant, bank_account_number: e.target.value })}
          placeholder="9 to 18 digit account number"
          pattern="^[0-9]{9,18}$"
          required
        />
      </div>

      <div className="form-group">
        <label>{requiredLabel("PAN Number")}</label>
        <input
          value={applicant.pan_number}
          onChange={(e) => onChange({ ...applicant, pan_number: e.target.value.toUpperCase() })}
          placeholder="ABCDE1234F or AB******4F"
          pattern="^(?:[A-Z]{5}[0-9]{4}[A-Z]|[A-Z]{2}\\*{6}[0-9][A-Z])$"
          required
        />
      </div>

      {loanType !== "education" && (
        <>
          <div className="form-group">
            <label>{requiredLabel("Salary Income (per month)")}</label>
            <input
              type="number"
              value={applicant.salary_income}
              onChange={(e) => onChange({ ...applicant, salary_income: normalizeNumberInput(e.target.value) })}
              min={0}
              max={10000000}
              required
            />
          </div>

          <div className="form-group">
            <label>{requiredLabel("Monthly Average Balance")}</label>
            <input
              type="number"
              value={applicant.monthly_avg_balance}
              onChange={(e) => onChange({ ...applicant, monthly_avg_balance: normalizeNumberInput(e.target.value) })}
              min={0}
              required
            />
          </div>
        </>
      )}

      {loanType === "education" && (
        <>
          <div className="form-group">
            <label>{requiredLabel("College Details")}</label>
            <input
              value={applicant.college_details}
              onChange={(e) => onChange({ ...applicant, college_details: e.target.value })}
              placeholder="College name and location"
              maxLength={300}
              required
            />
          </div>

          <div className="form-group">
            <label>{requiredLabel("Course Details")}</label>
            <input
              value={applicant.course_details}
              onChange={(e) => onChange({ ...applicant, course_details: e.target.value })}
              placeholder="Course name and duration"
              maxLength={300}
              required
            />
          </div>
        </>
      )}

      <div className="form-group">
        <label>{isGuarantorRequired ? requiredLabel("Guarantor Name") : "Guarantor Name (optional)"}</label>
        <input
          value={applicant.guarantor_name}
          onChange={(e) => onChange({ ...applicant, guarantor_name: e.target.value })}
          placeholder="Guarantor full name"
          maxLength={100}
          required={isGuarantorRequired}
        />
      </div>

      <div className="form-group">
        <label>{isGuarantorRequired ? requiredLabel("Guarantor Phone") : "Guarantor Phone (optional)"}</label>
        <input
          value={applicant.guarantor_phone}
          onChange={(e) => onChange({ ...applicant, guarantor_phone: e.target.value })}
          placeholder="+911234567890"
          pattern="^\\+?[0-9]{10,15}$"
          required={isGuarantorRequired}
        />
      </div>

      <div className="form-group">
        <label>{isGuarantorRequired ? requiredLabel("Guarantor PAN") : "Guarantor PAN (optional)"}</label>
        <input
          value={applicant.guarantor_pan}
          onChange={(e) => onChange({ ...applicant, guarantor_pan: e.target.value.toUpperCase() })}
          placeholder="ABCDE1234F"
          pattern="^[A-Z]{5}[0-9]{4}[A-Z]$"
          required={isGuarantorRequired}
        />
      </div>

      {loanType === "education" && (
        <div className="form-group">
          <label>Collateral (optional)</label>
          <input
            value={applicant.collateral}
            onChange={(e) => onChange({ ...applicant, collateral: e.target.value })}
            placeholder="Collateral details"
            maxLength={200}
          />
        </div>
      )}

      {loanType === "vehicle" && (
        <>
          <div className="form-group">
            <label>{requiredLabel("Vehicle Type")}</label>
            <select
              value={applicant.vehicle_type}
              onChange={(e) => onChange({ ...applicant, vehicle_type: e.target.value })}
              required
            >
              <option value="two_wheeler">Two Wheeler</option>
              <option value="four_wheeler">Four Wheeler</option>
            </select>
          </div>
          <div className="form-group">
            <label>{requiredLabel("Vehicle Model")}</label>
            <input
              value={applicant.vehicle_model}
              onChange={(e) => onChange({ ...applicant, vehicle_model: e.target.value })}
              placeholder="Model name"
              minLength={2}
              maxLength={100}
              required
            />
          </div>
        </>
      )}

      {loanType === "home" && (
        <>
          <div className="form-group">
            <label>{requiredLabel("Property Type")}</label>
            <select
              value={applicant.property_type}
              onChange={(e) => onChange({ ...applicant, property_type: e.target.value })}
              required
            >
              <option value="apartment">Apartment</option>
              <option value="independent_house">Independent House</option>
              <option value="villa">Villa</option>
              <option value="plot">Plot</option>
              <option value="commercial">Commercial</option>
            </select>
          </div>

          <div className="form-group">
            <label>{requiredLabel("Property Address")}</label>
            <input
              value={applicant.property_address}
              onChange={(e) => onChange({ ...applicant, property_address: e.target.value })}
              placeholder="Property full address"
              maxLength={300}
              required
            />
          </div>

          <div className="form-group">
            <label>{requiredLabel("Property Value")}</label>
            <input
              type="number"
              value={applicant.property_value}
              onChange={(e) => onChange({ ...applicant, property_value: normalizeNumberInput(e.target.value) })}
              min={1}
              required
            />
          </div>

          <div className="form-group">
            <label>{requiredLabel("Down Payment")}</label>
            <input
              type="number"
              value={applicant.down_payment}
              onChange={(e) => onChange({ ...applicant, down_payment: normalizeNumberInput(e.target.value) })}
              min={0}
              required
            />
          </div>
        </>
      )}
    </div>
  );
}

