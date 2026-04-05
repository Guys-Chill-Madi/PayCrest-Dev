interface Props {
  loanType: "personal" | "vehicle" | "education" | "home";
  onUpload: (docs: UploadedDoc[]) => void;
}

export type UploadedDoc = {
  key: "pay_slip" | "vehicle_price_doc" | "home_property_doc" | "fees_structure" | "bonafide_certificate" | "collateral_doc";
  label: string;
  filename: string;
  file: File;
  size?: number;
  status: "pending";
  uploadedAt: number;
};

type DocSpec = {
  key: UploadedDoc["key"];
  label: string;
  accept: string;
  required: boolean;
};

const docsByLoan: Record<"personal" | "vehicle" | "education" | "home", DocSpec[]> = {
  personal: [
    { key: "pay_slip", label: "Pay Slip (PDF)", accept: "application/pdf", required: true },
  ],
  vehicle: [
    { key: "pay_slip", label: "Pay Slip (PDF)", accept: "application/pdf", required: true },
    { key: "vehicle_price_doc", label: "Vehicle Price Doc (PDF)", accept: "application/pdf", required: true },
  ],
  education: [
    { key: "pay_slip", label: "Pay Slip (PDF)", accept: "application/pdf", required: true },
    { key: "fees_structure", label: "Fees Structure (PDF)", accept: "application/pdf", required: true },
    { key: "bonafide_certificate", label: "Bonafide Certificate (PDF)", accept: "application/pdf", required: true },
    { key: "collateral_doc", label: "Collateral Document (Optional PDF)", accept: "application/pdf", required: false },
  ],
  home: [
    { key: "pay_slip", label: "Pay Slip (PDF)", accept: "application/pdf", required: true },
    { key: "home_property_doc", label: "Home Property Document (PDF)", accept: "application/pdf", required: true },
  ],
};

const requiredDocKeysByLoan: Record<Props["loanType"], UploadedDoc["key"][]> = {
  personal: ["pay_slip"],
  vehicle: ["pay_slip", "vehicle_price_doc"],
  education: ["pay_slip", "fees_structure", "bonafide_certificate"],
  home: ["pay_slip", "home_property_doc"],
};

export const getRequiredDocKeys = (loanType: Props["loanType"]): UploadedDoc["key"][] => requiredDocKeysByLoan[loanType];

export function DocumentUpload({ loanType, onUpload }: Props) {
  const docs = docsByLoan[loanType] || [];

  const handleFile = (doc: DocSpec, file?: File | null) => {
    if (!file) return;
    onUpload([
      {
        key: doc.key,
        label: doc.label,
        filename: file.name,
        file,
        size: file.size,
        status: "pending",
        uploadedAt: Date.now(),
      },
    ]);
  };

  return (
    <div className="step-card">
      <h3>Upload Documents</h3>

      {docs.map((doc) => (
        <div key={doc.key} className={`upload-box ${doc.required ? "required-upload" : ""}`}>
          <label>
            {doc.label}
            {doc.required && <span className="required-star">*</span>}
          </label>
          <input
            type="file"
            accept={doc.accept}
            required={doc.required}
            onChange={(e) => handleFile(doc, e.target.files?.[0])}
          />
        </div>
      ))}
    </div>
  );
}

