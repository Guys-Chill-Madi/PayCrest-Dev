import { getSession } from "./session";
import { getAutoIdempotencyKey } from "./idempotency";

// Gateway runs on 3000. Was incorrectly set to 8000.
const DEFAULT_BASE = "http://localhost:3000/api";
const IDEMPOTENCY_HEADER = "Idempotency-Key";

export const apiBaseUrl =
  (import.meta as any).env?.VITE_API_BASE_URL || DEFAULT_BASE;

export function buildHeaders(auth = true, extra?: HeadersInit) {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (extra) {
    if (extra instanceof Headers) {
      extra.forEach((value, key) => { headers[key] = value; });
    } else if (Array.isArray(extra)) {
      for (const [key, value] of extra) { headers[key] = value; }
    } else if (typeof extra === "object") {
      Object.assign(headers, extra as Record<string, string>);
    }
  }

  if (auth) {
    const session = getSession();
    if (session?.accessToken) {
      headers.Authorization = `Bearer ${session.accessToken}`;
    } else {
      console.warn("[buildHeaders] No session or accessToken found", { session });
    }
  }

  return headers;
}

export async function request<T>(
  path: string,
  options: RequestInit & { auth?: boolean; idempotencyKey?: string } = {},
): Promise<T> {
  const url = `${apiBaseUrl}${path}`;
  const auth = options.auth !== false;
  const method = String(options.method || "GET").toUpperCase();

  const mergedHeaders = buildHeaders(auth, options.headers);

  const hasIdempotencyKey = Object.keys(mergedHeaders).some(
    (k) => k.toLowerCase() === IDEMPOTENCY_HEADER.toLowerCase(),
  );

  if (
    !hasIdempotencyKey &&
    method !== "GET" &&
    method !== "HEAD" &&
    method !== "OPTIONS"
  ) {
    mergedHeaders[IDEMPOTENCY_HEADER] =
      options.idempotencyKey ||
      getAutoIdempotencyKey({ method, path, body: options.body });
  }

  const res = await fetch(url, { ...options, headers: mergedHeaders });

  const text = await res.text();
  let data: any = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
  }

  if (!res.ok) {
    const message =
      data?.detail?.error ||
      data?.detail ||
      data?.message ||
      res.statusText ||
      "Request failed";
    const errorMsg = typeof message === "string" ? message : JSON.stringify(message);
    const fullError = `${res.status} ${res.statusText}: ${errorMsg} (${url})`;
    console.error(`[request] Error:`, fullError);
    const err = new Error(fullError);
    try { (err as any).response = data; } catch {}
    (err as any).status = res.status;
    try {
      let human: string | null = null;
      if (data?.detail?.details && typeof data.detail.details === "object") {
        const parts: string[] = [];
        for (const [k, v] of Object.entries(data.detail.details)) {
          parts.push(`${String(k).replace(/_/g, " ")}: ${String(v)}`);
        }
        human = `${data.detail.error || "Validation failed"}: ${parts.join("; ")}`;
      } else if (data?.detail && typeof data.detail === "string") {
        human = data.detail;
      } else if (data?.message) {
        human = String(data.message);
      } else {
        human = `${res.status} ${res.statusText}`;
      }
      (err as any).humanMessage = human;
    } catch {}
    throw err;
  }

  return data as T;
}