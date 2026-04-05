export function maskPan(value?: string | null): string {
  const raw = String(value || "").trim().toUpperCase();
  if (!raw) return "-";
  if (raw.includes("*")) return raw;
  const pan = raw.replace(/[^A-Z0-9]/g, "");
  if (pan.length <= 4) return pan;
  if (pan.length === 10) return `${pan.slice(0, 2)}******${pan.slice(-2)}`;
  return `${pan.slice(0, 2)}${"*".repeat(Math.max(1, pan.length - 4))}${pan.slice(-2)}`;
}

export function maskAadhaar(value?: string | null): string {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  if (raw.toUpperCase().includes("X")) return raw;
  const digits = raw.replace(/\D/g, "");
  if (digits.length <= 4) return digits;
  return `XXXX-XXXX-${digits.slice(-4)}`;
}
