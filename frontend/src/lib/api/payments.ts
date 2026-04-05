import { request } from "./base";
import { generateIdempotencyKey } from "./idempotency";

export async function createCashfreeEmiOrder(loanId: string | number) {
  return request<{
    order_id: string;
    order_amount: number;
    order_currency: string;
    payment_session_id?: string | null;
    payment_link?: string | null;
    cashfree?: any;
  }>(`/payments/cashfree/emi/${loanId}/create`, {
    method: "POST",
    idempotencyKey: generateIdempotencyKey(`payments-cashfree-emi-create-${loanId}`),
  });
}

export async function getCashfreeOrderStatus(orderId: string) {
  return request<{
    order_id: string;
    purpose?: string;
    status: string;
    order_status?: string;
    amount: number;
    updated_at?: string;
  }>(`/payments/cashfree/orders/${orderId}`, { method: "GET" });
}

export async function createCashfreeWalletTopupOrder(payload: {
  amount: number;
  mpin?: string;
  description?: string;
}) {
  return request<{
    order_id: string;
    order_amount: number;
    order_currency: string;
    payment_session_id?: string | null;
    payment_link?: string | null;
    cashfree?: any;
  }>(`/payments/cashfree/wallet/topup/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    idempotencyKey: generateIdempotencyKey("payments-cashfree-wallet-topup-create"),
  });
}

export async function confirmCashfreeOrder(orderId: string) {
  return request<{
    ok: boolean;
    paid?: boolean;
    purpose?: string;
    amount?: number;
    topup_amount?: number;
    emi_amount?: number;
    order_status?: string;
    status?: string;
  }>(`/payments/cashfree/orders/${orderId}/confirm`, {
    method: "POST",
    idempotencyKey: generateIdempotencyKey(`payments-cashfree-confirm-${orderId}`),
  });
}

export async function startHybridEmiPayment(loanId: string | number, mpin: string) {
  return request<{
    paid: boolean;
    mode: string;
    amount?: number;
    order_id?: string;
    topup_amount?: number;
    emi_amount?: number;
    payment_session_id?: string | null;
    payment_link?: string | null;
  }>(`/payments/cashfree/emi/${loanId}/hybrid/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mpin }),
    idempotencyKey: generateIdempotencyKey(`payments-cashfree-hybrid-start-${loanId}`),
  });
}
