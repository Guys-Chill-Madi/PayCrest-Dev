import { apiBaseUrl, request } from "./base";
import { generateIdempotencyKey } from "./idempotency";

export type VerificationTeamMember = {
  _id: string | number;
  full_name?: string;
  email?: string;
  role?: string;
  is_active?: boolean;
  employee_code?: string;
  department?: string;
  designation?: string;
};

export async function managerLoans() {
  return request<any[]>("/manager/loans");
}

export async function managerVerificationTeam(activeOnly: boolean = true) {
  return request<VerificationTeamMember[]>(`/manager/verification-team?active_only=${activeOnly ? "true" : "false"}`);
}

export async function managerPendingSignatureVerifications() {
  return request<any[]>("/manager/sanction-letters/pending-verification");
}

export async function managerVerifySanctionSignature(
  loanId: string | number,
  payload: { approve: boolean; remarks?: string | null },
) {
  return request(`/manager/sanction-letters/${loanId}/verify-signature`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    idempotencyKey: generateIdempotencyKey(`manager-verify-signature-${loanId}`),
  });
}

export function managerSanctionLetterUrl(loanId: string | number) {
  return `${apiBaseUrl}/manager/loans/${loanId}/sanction-letter`;
}

export function managerSignedSanctionLetterUrl(loanId: string | number) {
  return `${apiBaseUrl}/manager/loans/${loanId}/signed-sanction-letter`;
}

export function customerSanctionLetterUrl(loanId: string | number) {
  return `${apiBaseUrl}/customer/loans/${loanId}/sanction-letter`;
}

export function customerSignedSanctionLetterUrl(loanId: string | number) {
  return `${apiBaseUrl}/customer/loans/${loanId}/signed-sanction-letter`;
}

export async function assignVerification(
  loanCollection: string,
  loanId: string | number,
  verificationId: string,
) {
  return request(
    `/manager/assign-verification/${loanCollection}/${loanId}/${verificationId}`,
    {
      method: "PUT",
      idempotencyKey: generateIdempotencyKey(`manager-assign-${loanCollection}-${loanId}-${verificationId}`),
    },
  );
}

export async function managerApprove(loanCollection: string, loanId: string | number) {
  return request(`/manager/approve/${loanCollection}/${loanId}`, {
    method: "PUT",
    idempotencyKey: generateIdempotencyKey(`manager-approve-${loanCollection}-${loanId}`),
  });
}

export async function managerReject(loanCollection: string, loanId: string | number) {
  return request(`/manager/reject/${loanCollection}/${loanId}`, {
    method: "PUT",
    idempotencyKey: generateIdempotencyKey(`manager-reject-${loanCollection}-${loanId}`),
  });
}

export async function managerForwardToAdmin(
  loanId: string | number,
  payload: { recommendation?: string | null; remarks?: string | null },
) {
  return request(`/manager/loans/${loanId}/forward-to-admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    idempotencyKey: generateIdempotencyKey(`manager-forward-to-admin-${loanId}`),
  });
}
