export const IST_TIMEZONE = "Asia/Kolkata" as const;

type Dateish = string | number | Date | null | undefined;

function toDate(value: Dateish): Date | null {
  if (!value) return null;
  let candidate: any = value;
  if (typeof value === "string") {
    const text = value.trim();
    // Backward compatibility: older backend responses emitted naive UTC datetimes
    // like "2026-02-23T05:34:00". Treat them as UTC by appending "Z".
    const looksNaiveIso =
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/i.test(text);
    if (looksNaiveIso) candidate = `${text}Z`;
  }
  const d = value instanceof Date ? value : new Date(candidate);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatISTDate(
  value: Dateish,
  opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "2-digit" },
  fallback = "-",
) {
  const d = toDate(value);
  if (!d) return fallback;
  return d.toLocaleDateString("en-IN", { timeZone: IST_TIMEZONE, ...opts });
}

export function formatISTTime(
  value: Dateish,
  opts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", second: "2-digit" },
  fallback = "-",
) {
  const d = toDate(value);
  if (!d) return fallback;
  return d.toLocaleTimeString("en-IN", { timeZone: IST_TIMEZONE, ...opts });
}

export function formatISTDateTime(
  value: Dateish,
  opts: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  },
  fallback = "-",
) {
  const d = toDate(value);
  if (!d) return fallback;
  return d.toLocaleString("en-IN", { timeZone: IST_TIMEZONE, ...opts });
}
