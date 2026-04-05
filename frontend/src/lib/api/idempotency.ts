const DEFAULT_WINDOW_MS = 15_000;

type Entry = { key: string; createdAt: number };

const cache = new Map<string, Entry>();

function stableStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function fingerprintBody(body: RequestInit["body"]): string {
  if (!body) return "";
  if (typeof body === "string") return body;
  if (body instanceof URLSearchParams) return body.toString();
  if (body instanceof FormData) {
    const parts: Array<[string, string]> = [];
    for (const [k, v] of body.entries()) {
      if (v instanceof File) {
        parts.push([k, `file:${v.name}:${v.size}:${v.type}`]);
      } else {
        parts.push([k, `value:${String(v)}`]);
      }
    }
    return stableStringify(parts);
  }
  if (body instanceof Blob) {
    return `blob:${body.size}:${(body as any).type || ""}`;
  }
  return stableStringify(body);
}

function cleanup(now: number, windowMs: number) {
  for (const [fp, entry] of cache.entries()) {
    if (now - entry.createdAt > windowMs) cache.delete(fp);
  }
}

export function getAutoIdempotencyKey(params: {
  method: string;
  path: string;
  body: RequestInit["body"];
  windowMs?: number;
}): string {
  const now = Date.now();
  const windowMs = params.windowMs ?? DEFAULT_WINDOW_MS;
  cleanup(now, windowMs);

  const fp = `${params.method.toUpperCase()} ${params.path} ${fingerprintBody(params.body)}`;
  const existing = cache.get(fp);
  if (existing && now - existing.createdAt <= windowMs) return existing.key;

  const key =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${now}-${Math.random().toString(16).slice(2)}`;
  cache.set(fp, { key, createdAt: now });
  return key;
}

export function generateIdempotencyKey(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
