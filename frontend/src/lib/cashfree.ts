// Cashfree SDK stub
// Real SDK removed — project uses mock payment service for DevOps training.
// The mock payment endpoints process payments instantly without a checkout redirect.

export async function openCashfreeCheckout(_params: {
  paymentSessionId: string;
  redirectTarget?: "_self" | "_blank";
  mode?: "sandbox" | "production";
}): Promise<void> {
  // No-op: mock flow does not require a checkout redirect
  console.info("[Mock] Cashfree checkout skipped — using mock payment service");
}