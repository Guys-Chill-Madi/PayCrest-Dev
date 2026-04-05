import { request } from "./base";
import { generateIdempotencyKey } from "./idempotency";
import type { AuthSession } from "./session";

export type MyProfile = {
  _id: string | number;
  email?: string;
  role?: string;
  full_name?: string;
  phone?: string;
  is_active?: boolean;
  created_at?: string;
  last_login_at?: string;
  department?: string;
  designation?: string;
  employee_code?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
};

export async function login(email: string, password: string) {
  const body = new URLSearchParams();
  body.set("username", email);
  body.set("password", password);
  return request<{
    access_token: string;
    token_type: string;
    role: AuthSession["role"];
    user_id: string;
    mpin_set: boolean;
  }>("/auth/token", {
    method: "POST",
    auth: false,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
}

export async function registerCustomer(payload: {
  full_name: string;
  email: string;
  password: string;
  phone?: string;
  dob?: string;
  gender?: string;
  pan_number?: string;
}) {
  return request<{
    customer_id: string | number;
    account_number: number;
    ifsc: string;
    balance: number;
  }>("/auth/register", {
    method: "POST",
    auth: false,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    idempotencyKey: generateIdempotencyKey(`auth-register-${payload.email.toLowerCase().trim()}`),
  });
}

export async function getMyProfile() {
  return request<MyProfile>("/auth/me");
}

export async function updateMyProfile(payload: Partial<MyProfile>) {
  return request<MyProfile>("/auth/me", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    idempotencyKey: generateIdempotencyKey("auth-me-update"),
  });
}

export async function changeMyPassword(payload: {
  current_password: string;
  new_password: string;
  confirm_password: string;
}) {
  return request<{ message: string }>("/auth/me/password", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    idempotencyKey: generateIdempotencyKey("auth-me-password-update"),
  });
}

export async function forgotPasswordWithPan(payload: {
  email: string;
  pan_number: string;
  new_password: string;
  confirm_password: string;
}) {
  return request<{ message: string }>("/auth/forgot-password/pan", {
    method: "POST",
    auth: false,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    idempotencyKey: generateIdempotencyKey(`auth-forgot-password-pan-${payload.email.toLowerCase().trim()}`),
  });
}
