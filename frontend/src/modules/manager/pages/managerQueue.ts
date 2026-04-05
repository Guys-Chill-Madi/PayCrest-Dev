export type LoanRow = {
  loan_id: number;
  customer_id?: string | number;
  full_name?: string;
  loan_amount?: number;
  tenure_months?: number;
  status?: string;
  updated_at?: string | number;
  applied_at?: string | number;
  manager_approved_at?: string | number;
  manager_forwarded_at?: string | number;
  signature_verified_at?: string | number;
  disbursed_at?: string | number;
  rejected_at?: string | number;
  foreclosed_at?: string | number;
  vehicle_type?: string;
  vehicle_model?: string;
  vehicle_price_doc?: string;
};

export const getRowTs = (l: LoanRow) => {
  const raw =
    l.signature_verified_at ||
    l.manager_approved_at ||
    l.manager_forwarded_at ||
    l.disbursed_at ||
    l.rejected_at ||
    l.foreclosed_at ||
    l.updated_at ||
    l.applied_at;
  const ts = typeof raw === "number" ? raw : raw ? Date.parse(String(raw)) : NaN;
  return Number.isFinite(ts) ? ts : 0;
};

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

export function partitionManagerLoans(loans: LoanRow[]) {
  const needsAssignment: LoanRow[] = [];
  const pendingReviews: LoanRow[] = [];
  const recent: LoanRow[] = [];

  (loans || []).forEach((l) => {
    const status = String(l.status || "").toLowerCase();
    if (status === "applied") needsAssignment.push(l);
    else if (status === "verification_done") pendingReviews.push(l);
    else if (
      [
        "manager_approved",
        "pending_admin_approval",
        "admin_approved",
        "sanction_sent",
        "ready_for_disbursement",
        "rejected",
        "active",
        "completed",
        "foreclosed",
        "disbursed",
      ].includes(status)
    ) {
      recent.push(l);
    }
  });

  recent.sort((a, b) => getRowTs(b) - getRowTs(a));
  return { needsAssignment, pendingReviews, recent };
}

export function filterPendingSignatures(sigLoans: LoanRow[]) {
  return (sigLoans || []).filter((l) => String(l.status || "").toLowerCase() === "signed_received");
}


