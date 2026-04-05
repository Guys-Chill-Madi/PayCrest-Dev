import { request } from "./base";

export async function listTransactions() {
  return request<
    Array<{
      id: string;
      loan_id?: number;
      loan_type?: string;
      type?: string;
      amount?: number;
      balance_after?: number;
      created_at?: string;
    }>
  >("/transactions/");
}

