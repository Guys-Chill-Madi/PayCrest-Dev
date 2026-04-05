export type LoanRow = {
  loan_id?: number | string;
  _id?: string;
  customer_id?: string | number;
  full_name?: string;
  loan_amount?: number;
  tenure_months?: number;
  status?: string;
  applied_at?: string | number;
  vehicle_type?: string;
  vehicle_model?: string;
  vehicle_price_doc?: string;
};

export const normalizeStatus = (v: unknown) => String(v || "").toLowerCase().trim();

export const getLoanId = (loan: LoanRow) => (loan.loan_id ?? (loan as any)._id ?? (loan as any).id ?? "-");

export const getLoanCollection = (loan: LoanRow) => {
  const explicit = (loan as any)?.loan_collection;
  if (explicit) return String(explicit);
  if (loan.vehicle_type || loan.vehicle_model || loan.vehicle_price_doc) return "vehicle_loans";
  if ((loan as any)?.property_type || (loan as any)?.home_property_doc) return "home_loans";
  if ((loan as any)?.college_details || (loan as any)?.course_details || (loan as any)?.fees_structure) return "education_loans";
  return "personal_loans";
};

export const loanTypeLabel = (collection: string) =>
  collection === "vehicle_loans"
    ? "VEHICLE"
    : collection === "home_loans"
      ? "HOME"
      : collection === "education_loans"
        ? "EDUCATION"
        : "PERSONAL";


