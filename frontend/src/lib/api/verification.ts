import { apiBaseUrl, request } from "./base";
import { generateIdempotencyKey } from "./idempotency";

export async function verificationDashboard() {
  return request<{
    pending_kyc: any[];
    pending_loan_verifications: any[];
    processed_kyc?: any[];
    processed_loan_verifications?: any[];
  }>("/verification/dashboard");
}

export async function getKyc(customerId: string | number) {
  return request(`/verification/kyc/${customerId}`);
}

export async function verifyKyc(
  customerId: string | number,
  payload: {
    approve: boolean;
    employment_score: number;
    income_score: number;
    emi_score: number;
    experience_score: number;
    total_score?: number;
    cibil_score?: number;
    remarks?: string;
  },
) {
  return request(`/verification/verify-kyc/${customerId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    idempotencyKey: generateIdempotencyKey(`verification-kyc-${customerId}`),
  });
}

export function downloadKycDocumentUrl(
  customerId: string | number,
  docType: string,
) {
  return `${apiBaseUrl}/verification/download-kyc-document/${customerId}/${docType}`;
}

export async function getLoanDocuments(loanId: string | number) {
  return request<{
    error?: string;
    pay_slip?: string;
    vehicle_price_doc?: string;
    home_property_doc?: string;
    fees_structure?: string;
    bonafide_certificate?: string;
    collateral_doc?: string;
  }>(`/verification/loan-documents/${loanId}`);
}

export function downloadLoanDocumentUrl(loanId: string | number, docType: string) {
  return `${apiBaseUrl}/verification/download-loan-document/${loanId}/${docType}`;
}

export async function verifyLoan(
  loanCollection: string,
  loanId: string | number,
  approved: boolean,
) {
  const url = `/verification/verify-loan/${loanCollection}/${loanId}?approved=${approved}`;
  return request(url, {
    method: "PUT",
    idempotencyKey: generateIdempotencyKey(`verification-loan-${loanCollection}-${loanId}`),
  });
}
