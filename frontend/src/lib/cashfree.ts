declare global {
  interface Window {
    Cashfree?: any;
  }
}

const CASHFREE_SDK_SRC = "https://sdk.cashfree.com/js/v3/cashfree.js";

async function loadCashfreeSdk(): Promise<any> {
  if (typeof window === "undefined") throw new Error("Cashfree SDK requires a browser");
  if (window.Cashfree) return window.Cashfree;

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${CASHFREE_SDK_SRC}"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Cashfree SDK")));
      return;
    }

    const script = document.createElement("script");
    script.src = CASHFREE_SDK_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Cashfree SDK"));
    document.head.appendChild(script);
  });

  if (!window.Cashfree) throw new Error("Cashfree SDK loaded but global Cashfree is missing");
  return window.Cashfree;
}

export async function openCashfreeCheckout(params: {
  paymentSessionId: string;
  redirectTarget?: "_self" | "_blank";
  mode?: "sandbox" | "production";
}) {
  const Cashfree = await loadCashfreeSdk();
  const mode =
    params.mode ||
    ((import.meta as any).env?.VITE_CASHFREE_ENV as "sandbox" | "production" | undefined) ||
    "sandbox";

  const cashfree = new Cashfree({ mode });
  const redirectTarget = params.redirectTarget || "_self";

  return cashfree.checkout({
    paymentSessionId: params.paymentSessionId,
    redirectTarget,
  });
}

