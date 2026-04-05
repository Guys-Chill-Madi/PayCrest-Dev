import { apiBaseUrl, buildHeaders, request } from "./base";
import { generateIdempotencyKey } from "./idempotency";
import { getSession } from "./session";

export type LoanOfferType = "personal" | "vehicle" | "education" | "home";

export interface CustomerLoanOffer {
  loan_type: LoanOfferType;
  interest_rate: number;
  min_amount: number;
  max_amount: number;
  eligible_min_amount: number;
  eligible_max_amount: number;
  min_tenure_months: number;
  max_tenure_months: number;
  cibil_eligible: boolean;
}

export interface CustomerLoanOffersResponse {
  cibil_score: number;
  min_cibil_required: number;
  score: number;
  suggested_max_loan: number;
  offers: Record<LoanOfferType, CustomerLoanOffer>;
}

export async function getCustomerProfile() {
  return request<{
    name: string;
    email: string;
    account_number: number;
    ifsc: string;
    pan_number: string;
    balance: number;
    cibil_score?: number;
    kyc_status: string;
    active_loans: number;
    remaining_tenure: number;
    remaining_amount: number;
  }>("/customer/get/profile");
}

export async function submitKyc(form: FormData) {
  return request("/customer/submit-kyc", {
    method: "POST",
    body: form,
    idempotencyKey: generateIdempotencyKey("kyc-submit"),
  });
}

export async function getCustomerKycDetails() {
  return request<Record<string, any>>("/customer/kyc");
}

export async function applyPersonalLoan(form: FormData) {
  return request("/customer/apply-personal-loan", {
    method: "POST",
    body: form,
    idempotencyKey: generateIdempotencyKey("loan-apply-personal"),
  });
}

export async function applyVehicleLoan(form: FormData) {
  return request("/customer/apply-vehicle-loan", {
    method: "POST",
    body: form,
    idempotencyKey: generateIdempotencyKey("loan-apply-vehicle"),
  });
}

export async function applyEducationLoan(form: FormData) {
  return request("/customer/apply-education-loan", {
    method: "POST",
    body: form,
    idempotencyKey: generateIdempotencyKey("loan-apply-education"),
  });
}

export async function applyHomeLoan(form: FormData) {
  return request("/customer/apply-home-loan", {
    method: "POST",
    body: form,
    idempotencyKey: generateIdempotencyKey("loan-apply-home"),
  });
}

export async function listCustomerLoans() {
  return request<any[]>("/customer/loans");
}

export async function getCustomerEmiDetails(loanId: string | number) {
  return request<{
    loan_id: number;
    loan_collection?: string;
    next_due_date?: string | null;
    overdue_count?: number;
    overdue_amount?: number;
    upcoming?: Array<{
      installment_no: number;
      due_date?: string | null;
      principal_amount?: number;
      interest_amount?: number;
      penalty_amount?: number;
      total_due?: number;
      status?: string;
    }>;
    history?: Array<{
      installment_no: number;
      due_date?: string | null;
      paid_at?: string | null;
      paid_amount?: number;
      status?: string;
    }>;
  }>(`/customer/loans/${loanId}/emi-details`);
}

export async function uploadSignedSanctionLetter(
  loanId: string | number,
  file: File,
) {
  const url = `/customer/loans/${loanId}/sanction-letter/upload`;
  const form = new FormData();
  form.append("signed_sanction_letter", file, file.name);
  const session = getSession();
  const requestHeaders = new Headers(buildHeaders(!!session));
  requestHeaders.set("Idempotency-Key", generateIdempotencyKey(`customer-upload-signed-sanction-${loanId}`));
  const res = await fetch(`${apiBaseUrl}${url}`, {
    method: "POST",
    headers: requestHeaders,
    body: form,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message =
      data?.detail || data?.message || res.statusText || "Upload failed";
    const err = new Error(
      `${res.status} ${res.statusText}: ${
        typeof message === "string" ? message : JSON.stringify(message)
      }`,
    );
    try {
      (err as any).response = data;
      // human-friendly
      if (data?.detail?.details && typeof data.detail.details === "object") {
        const parts: string[] = [];
        for (const [k, v] of Object.entries(data.detail.details)) {
          parts.push(`${String(k).replace(/_/g, " ")}: ${String(v)}`);
        }
        (err as any).humanMessage = `${
          data.detail.error || "Validation failed"
        }: ${parts.join("; ")}`;
      } else if (data?.detail && typeof data.detail === "string") {
        (err as any).humanMessage = data.detail;
      } else if (data?.message) {
        (err as any).humanMessage = String(data.message);
      } else {
        (err as any).humanMessage = `${res.status} ${res.statusText}`;
      }
    } catch {}
    throw err;
  }
  return data;
}

export async function downloadCustomerSanctionLetter(loanId: string | number) {
  const url = `${apiBaseUrl}/customer/loans/${loanId}/sanction-letter`;
  const res = await fetch(url, {
    method: "GET",
    headers: buildHeaders(true, { Accept: "application/pdf" }),
  });

  if (!res.ok) {
    let message =
      res.status === 404
        ? "Sanction letter not found for this loan."
        : `${res.status} ${res.statusText}`;
    try {
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      message = String(data?.detail || data?.message || message);
    } catch {
      // ignore parsing errors for non-JSON error bodies
    }
    throw new Error(message);
  }

  return res.blob();
}

export async function downloadCustomerNocLetter(loanId: string | number) {
  const url = `${apiBaseUrl}/customer/loans/${loanId}/noc`;
  const res = await fetch(url, {
    method: "GET",
    headers: buildHeaders(true, { Accept: "application/pdf" }),
  });

  if (!res.ok) {
    let message =
      res.status === 404
        ? "NOC letter not found for this loan."
        : `${res.status} ${res.statusText}`;
    try {
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      message = String(data?.detail || data?.message || message);
    } catch {
      // ignore parsing errors for non-JSON error bodies
    }
    throw new Error(message);
  }

  return res.blob();
}

export async function payEmi(loanId: string | number) {
  return request(`/customer/pay-emi/${loanId}`, {
    method: "POST",
    idempotencyKey: generateIdempotencyKey(`loan-emi-${loanId}`),
  });
}

export async function getLoanSettlement(loanId: string | number, options: { signal?: AbortSignal } = {}) {
  return request<{
    loan_id: number;
    loan_collection: string;
    remaining_amount: number;
    pending_penalties: number;
    foreclosure_fee_percentage: number;
    foreclosure_fee: number;
    settlement_amount: number;
  }>(`/customer/loans/${loanId}/settlement`, {
    signal: options.signal,
  });
}

export async function forecloseLoan(loanId: string | number) {
  return request(`/customer/loans/${loanId}/foreclose`, {
    method: "POST",
    idempotencyKey: generateIdempotencyKey(`loan-foreclose-${loanId}`),
  });
}

export async function addMoney(amount: number) {
  return request(`/customer/add-money?amount=${encodeURIComponent(amount)}`, {
    method: "POST",
    idempotencyKey: generateIdempotencyKey("customer-add-money"),
  });
}

export async function getCustomerNotifications(limit: number = 100) {
  return request<Array<{
    _id: string;
    customer_id: string | number;
    title: string;
    message: string;
    kind?: "info" | "success" | "warning" | "error";
    read?: boolean;
    created_at: string;
  }>>(`/customer/notifications?limit=${encodeURIComponent(String(limit))}`);
}

export async function getCustomerLoanOffers() {
  return request<CustomerLoanOffersResponse>("/customer/loan-offers");
}

export type SupportCategory = "kyc" | "payment" | "loan" | "wallet" | "documents" | "other";
export type SupportStatus = "open" | "closed";

export interface SupportTicketAttachment {
  name: string;
  size: number;
  type?: string | null;
}

export interface CustomerSupportTicket {
  ticket_id: string;
  customer_id: string;
  category: SupportCategory;
  subject: string;
  message: string;
  attachment?: SupportTicketAttachment | null;
  status: SupportStatus;
  admin_reply?: string | null;
  resolved_at?: string | null;
  resolved_by?: string | null;
  created_at: string;
  updated_at: string;
}

export async function customerCreateSupportTicket(payload: {
  category: SupportCategory;
  subject: string;
  message: string;
  attachment?: SupportTicketAttachment | null;
}) {
  return request<CustomerSupportTicket>("/customer/support/tickets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    idempotencyKey: generateIdempotencyKey("customer-support-ticket-create"),
  });
}

export async function customerListSupportTickets() {
  return request<CustomerSupportTicket[]>("/customer/support/tickets");
}
