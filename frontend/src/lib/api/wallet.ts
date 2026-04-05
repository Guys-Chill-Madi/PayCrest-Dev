import { request } from "./base";
import { generateIdempotencyKey } from "./idempotency";

// ===== WALLET & TRANSACTION APIs =====
export type WalletMutationResponse = {
  new_balance?: number;
  balance?: number;
  wallet_balance?: number;
  current_balance?: number;
  [key: string]: unknown;
};

export async function getWalletBalance() {
  return request<{ balance: number }>("/wallet/balance", {
    method: "GET",
  });
}

export async function getTransactionHistory(page: number = 1, limit: number = 20) {
  return request(`/wallet/transactions?page=${page}&limit=${limit}`, {
    method: "GET",
  });
}

export async function addMoneyToWallet(
  amount: number,
  mpin: string,
  description: string = "Manual top-up",
) {
  return request<WalletMutationResponse>("/wallet/add-money", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, mpin, description }),
    idempotencyKey: generateIdempotencyKey("wallet-add-money"),
  });
}

export async function debitFromWallet(
  amount: number,
  mpin: string,
  description: string = "Manual debit",
) {
  return request<WalletMutationResponse>("/wallet/debit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, mpin, description }),
    idempotencyKey: generateIdempotencyKey("wallet-debit"),
  });
}

export async function getCustomerWalletBalance(customerId: string | number) {
  return request<{ balance: number }>(`/wallet/admin/customer/${customerId}/balance`, {
    method: "GET",
  });
}

