type RequiredDocTemplate = {
  key: string;
  label: string;
};

export const LOAN_REQUIRED_DOCS: Record<string, RequiredDocTemplate[]> = {
  education: [
    { key: "identity-proof", label: "Identity Proof" },
    { key: "address-proof", label: "Address Proof" },
    { key: "admission-letter", label: "Admission Letter" },
    { key: "income-proof", label: "Income Proof" },
  ],
  vehicle: [
    { key: "identity-proof", label: "Identity Proof" },
    { key: "address-proof", label: "Address Proof" },
    { key: "quotation", label: "Vehicle Quotation" },
    { key: "income-proof", label: "Income Proof" },
  ],
  personal: [
    { key: "identity-proof", label: "Identity Proof" },
    { key: "address-proof", label: "Address Proof" },
    { key: "income-proof", label: "Income Proof" },
    { key: "bank-statement", label: "Bank Statement" },
  ],
  home: [
    { key: "identity-proof", label: "Identity Proof" },
    { key: "address-proof", label: "Address Proof" },
    { key: "income-proof", label: "Income Proof" },
    { key: "property-documents", label: "Property Documents" },
  ],
  "education-loan": [],
  "vehicle-loan": [],
  "personal-loan": [],
  "home-loan": [],
};

LOAN_REQUIRED_DOCS["education-loan"] = LOAN_REQUIRED_DOCS.education;
LOAN_REQUIRED_DOCS["vehicle-loan"] = LOAN_REQUIRED_DOCS.vehicle;
LOAN_REQUIRED_DOCS["personal-loan"] = LOAN_REQUIRED_DOCS.personal;
LOAN_REQUIRED_DOCS["home-loan"] = LOAN_REQUIRED_DOCS.home;

export function isLoanType(type: unknown): type is string {
  if (typeof type !== "string") return false;
  return !!LOAN_REQUIRED_DOCS[type.toLowerCase().trim()];
}
