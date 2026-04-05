import { IST_TIMEZONE } from "./datetime";

type LocaleMethod = Date["toLocaleString"];

const PATCH_FLAG = "__paycrest_ist_locale_patched__";

function withIstTimezone(
  opts?: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormatOptions {
  if (opts?.timeZone) return opts;
  return { ...(opts || {}), timeZone: IST_TIMEZONE };
}

function patchLocaleMethod(
  key: "toLocaleString" | "toLocaleDateString" | "toLocaleTimeString",
) {
  const original = Date.prototype[key] as LocaleMethod;
  const patched: LocaleMethod = function patchedLocale(
    this: Date,
    locales?: string | string[],
    options?: Intl.DateTimeFormatOptions,
  ) {
    return original.call(this, locales || "en-IN", withIstTimezone(options));
  };
  Date.prototype[key] = patched as Date["toLocaleString"] &
    Date["toLocaleDateString"] &
    Date["toLocaleTimeString"];
}

export function applyIstLocalePatch() {
  const g = globalThis as typeof globalThis & Record<string, unknown>;
  if (g[PATCH_FLAG]) return;
  patchLocaleMethod("toLocaleString");
  patchLocaleMethod("toLocaleDateString");
  patchLocaleMethod("toLocaleTimeString");
  g[PATCH_FLAG] = true;
}

