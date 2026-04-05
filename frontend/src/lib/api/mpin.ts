import { request } from "./base";
import { generateIdempotencyKey } from "./idempotency";
import { getSession } from "./session";

export async function setupMPIN(mpin: string, confirmMpin: string) {
  console.log("[setupMPIN] Starting MPIN setup...");
  const session = getSession();
  console.log("[setupMPIN] Session:", {
    hasToken: !!session?.accessToken,
    role: session?.role,
    userId: session?.userId,
    mpinSet: session?.mpinSet,
  });

  try {
    const result = await request("/wallet/mpin/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mpin, confirm_mpin: confirmMpin }),
      idempotencyKey: generateIdempotencyKey("wallet-mpin-setup"),
    });
    console.log("[setupMPIN] Success:", result);
    return result;
  } catch (err) {
    console.error("[setupMPIN] Failed:", err instanceof Error ? err.message : err);
    throw err;
  }
}

export async function verifyMPIN(mpin: string) {
  return request("/wallet/mpin/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mpin }),
  });
}

export async function getMPINStatus() {
  return request<{ mpin_set: boolean }>("/wallet/mpin/status", {
    method: "GET",
  });
}

export async function resetMPIN(oldMpin: string, newMpin: string, confirmMpin: string) {
  return request("/wallet/mpin/reset", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      old_mpin: oldMpin,
      new_mpin: newMpin,
      confirm_mpin: confirmMpin,
    }),
    idempotencyKey: generateIdempotencyKey("wallet-mpin-reset"),
  });
}

export async function resetMPINWithPassword(
  password: string,
  newMpin: string,
  confirmMpin: string,
) {
  return request("/wallet/mpin/reset/password", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      password,
      new_mpin: newMpin,
      confirm_mpin: confirmMpin,
    }),
    idempotencyKey: generateIdempotencyKey("wallet-mpin-reset-password"),
  });
}
