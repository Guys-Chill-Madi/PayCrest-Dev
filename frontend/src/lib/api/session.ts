export type AppRole = "customer" | "admin" | "manager" | "verification";

export type AuthSession = {
  accessToken: string;
  role: AppRole;
  userId: string;
  mpinSet?: boolean;
};

const TOKEN_KEY = "auth_token";
const ROLE_KEY = "auth_role";
const USER_ID_KEY = "auth_user_id";
const MPIN_SET_KEY = "auth_mpin_set";

export function normalizeRole(role?: string | null): AppRole | null {
  const raw = String(role || "").toLowerCase().trim();
  if (raw === "verifier") return "verification";
  if (raw === "verification") return "verification";
  if (raw === "customer") return "customer";
  if (raw === "admin") return "admin";
  if (raw === "manager") return "manager";
  return null;
}

export function getSession(): AuthSession | null {
  const accessToken = localStorage.getItem(TOKEN_KEY);
  const role = normalizeRole(localStorage.getItem(ROLE_KEY));
  const userId = localStorage.getItem(USER_ID_KEY);
  const mpinSet = localStorage.getItem(MPIN_SET_KEY) === "true";
  if (!accessToken || !role || !userId) return null;
  return { accessToken, role, userId, mpinSet };
}

export function setSession(session: AuthSession) {
  localStorage.setItem(TOKEN_KEY, session.accessToken);
  localStorage.setItem(ROLE_KEY, session.role);
  localStorage.setItem(USER_ID_KEY, session.userId);
  const existingMpinSet = localStorage.getItem(MPIN_SET_KEY) === "true";
  const mpinSet = session.mpinSet ?? existingMpinSet;
  localStorage.setItem(MPIN_SET_KEY, String(mpinSet));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(MPIN_SET_KEY);
  try {
    sessionStorage.removeItem("cashfree_pending");
  } catch {
    // ignore storage failures
  }
}
