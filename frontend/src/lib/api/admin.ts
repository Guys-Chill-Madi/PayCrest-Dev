import { apiBaseUrl, buildHeaders, request } from "./base";
import { generateIdempotencyKey } from "./idempotency";
import { getSession } from "./session";

export async function adminPendingApprovals() {
  return request<any[]>("/admin/pending-approvals");
}

export async function adminApprovalsDashboard(days: number = 30) {
  return request<{
    pending_approvals: any[];
    processed_approvals: any[];
    cutoff_days?: number;
  }>(`/admin/approvals-dashboard?days=${encodeURIComponent(String(days))}`);
}

export async function adminAuditLogs(params?: {
  date_from?: string;
  date_to?: string;
  actor_id?: string;
  action?: string;
  entity_id?: string;
  limit?: number;
  page?: number;
}) {
  const qs = params
    ? "?" +
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&")
    : "";
  return request<
    | { items: any[]; next_cursor?: string }
    | { items: any[]; total?: number; page?: number; page_size?: number }
  >(`/admin/audit-logs${qs}`);
}

export async function adminAuditExport(params?: {
  date_from?: string;
  date_to?: string;
  actor_id?: string;
  action?: string;
  entity_id?: string;
  limit?: number;
}) {
  const qs = params
    ? "?" +
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&")
    : "";
  const url = `${apiBaseUrl}/admin/audit-logs/export${qs}`;
  const session = getSession();
  const res = await fetch(url, { headers: buildHeaders(!!session) });
  if (!res.ok) throw new Error(res.statusText || "Export failed");
  return res.blob();
}

export async function adminApprove(loanCollection: string, loanId: string | number) {
  return request(`/admin/approve/${loanCollection}/${loanId}`, {
    method: "PUT",
    idempotencyKey: generateIdempotencyKey(`admin-approve-${loanCollection}-${loanId}`),
  });
}

export async function adminSanction(loanCollection: string, loanId: string | number) {
  return request(`/admin/sanction/${loanCollection}/${loanId}`, {
    method: "PUT",
    idempotencyKey: generateIdempotencyKey(`admin-sanction-${loanCollection}-${loanId}`),
  });
}

export async function adminSigned(loanCollection: string, loanId: string | number) {
  return request(`/admin/signed/${loanCollection}/${loanId}`, {
    method: "PUT",
    idempotencyKey: generateIdempotencyKey(`admin-signed-${loanCollection}-${loanId}`),
  });
}

export async function adminDisburse(loanCollection: string, loanId: string | number) {
  return request(`/admin/disburse/${loanCollection}/${loanId}`, {
    method: "PUT",
    idempotencyKey: generateIdempotencyKey(`admin-disburse-${loanCollection}-${loanId}`),
  });
}

export async function adminReject(
  loanId: string | number,
  reason?: string | null,
) {
  // backend exposes a global reject endpoint by loan id; pass reason in body
  return request(`/admin/loans/${loanId}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason: reason ?? null }),
    idempotencyKey: generateIdempotencyKey(`admin-reject-${loanId}`),
  });
}

export async function adminUpdateSettings(payload: {
  personal_loan_interest: number;
  vehicle_loan_interest: number;
  education_loan_interest: number;
  home_loan_interest: number;
  min_cibil_required: number;
}) {
  return request("/admin/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    idempotencyKey: generateIdempotencyKey("admin-update-settings"),
  });
}

export async function adminGetSettings() {
  return request<{
    personal_loan_interest?: number;
    vehicle_loan_interest?: number;
    education_loan_interest?: number;
    home_loan_interest?: number;
    min_cibil_required?: number;
  }>(`/admin/settings`);
}

export async function adminCreateStaff(payload: {
  full_name: string;
  email: string;
  password: string;
  role: "manager" | "verification";
  phone?: string;
  department?: string;
  designation?: string;
  employee_code?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}) {
  return request("/admin/create-staff", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    idempotencyKey: generateIdempotencyKey(`admin-create-staff-${payload.email.toLowerCase().trim()}`),
  });
}

export async function adminListStaff() {
  return request("/admin/users", {
    method: "GET",
  });
}

export async function adminUpdateStaff(
  userId: string | number,
  payload: {
    full_name?: string;
    email?: string;
    password?: string;
    role?: "manager" | "verification";
    is_active?: boolean;
    phone?: string;
    department?: string;
    designation?: string;
    employee_code?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  },
) {
  return request(`/admin/users/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    idempotencyKey: generateIdempotencyKey(`admin-update-staff-${userId}`),
  });
}

export async function adminDeleteStaff(userId: string | number) {
  return request(`/admin/users/${userId}`, {
    method: "DELETE",
    idempotencyKey: generateIdempotencyKey(`admin-delete-staff-${userId}`),
  });
}

export async function adminGetLoan(loanCollection: string, loanId: string | number) {
  return request<{
    error?: string;
  }>(`/admin/loan/${loanCollection}/${loanId}`);
}

export async function adminEmiMonitoring() {
  return request<{
    generated_at?: string;
    active_loans?: number;
    total_overdue_installments?: number;
    total_penalty_amount?: number;
    escalation_loans?: number;
    loans?: Array<{
      loan_id: number;
      customer_id: string | number;
      loan_collection: string;
      emi_per_month?: number;
      overdue_installments?: number;
      consecutive_missed_emis?: number;
      next_due_date?: string | null;
      account_frozen?: boolean;
      recommended_action?: string;
      overdue_emis?: Array<{
        emi_id: string;
        installment_no?: number;
        due_date?: string | null;
        emi_amount?: number;
        penalty_amount?: number;
        status?: string;
      }>;
    }>;
  }>("/admin/emi/monitoring");
}

export async function adminApplyEmiPenalty(emiId: string, penaltyAmount: number, reason?: string) {
  return request(`/admin/emi/${encodeURIComponent(emiId)}/apply-penalty`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ penalty_amount: penaltyAmount, reason: reason ?? null }),
    idempotencyKey: generateIdempotencyKey(`admin-apply-emi-penalty-${emiId}`),
  });
}

export async function adminProcessEmiDefaults(payload?: {
  grace_days?: number;
  penalty_rate?: number;
  freeze_after_missed?: number;
}) {
  return request("/admin/emi/_process-defaults", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
    idempotencyKey: generateIdempotencyKey("admin-process-emi-defaults"),
  });
}

export type AdminSupportTicket = {
  ticket_id: string;
  customer_id: string;
  category: "kyc" | "payment" | "loan" | "wallet" | "documents" | "other";
  subject: string;
  message: string;
  attachment?: { name: string; size: number; type?: string | null } | null;
  status: "open" | "closed";
  admin_reply?: string | null;
  resolved_at?: string | null;
  resolved_by?: string | null;
  created_at: string;
  updated_at: string;
};

export async function adminListSupportTickets(params?: {
  status?: "all" | "open" | "closed";
  customer_id?: string;
}) {
  const qs = params
    ? "?" +
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && String(v) !== "")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&")
    : "";
  return request<AdminSupportTicket[]>(`/admin/support/tickets${qs}`);
}

export async function adminResolveSupportTicket(
  ticketId: string,
  payload: { reply_message: string; close_ticket?: boolean },
) {
  return request<AdminSupportTicket>(`/admin/support/tickets/${encodeURIComponent(ticketId)}/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reply_message: payload.reply_message,
      close_ticket: payload.close_ticket !== false,
    }),
    idempotencyKey: generateIdempotencyKey(`admin-support-resolve-${ticketId}`),
  });
}
