import { paystack } from "./paystack";
import { servicefabric } from "./servicefabric";
import type { PaymentProvider } from "./provider";

export * from "./provider";
export { makeReference, REFERENCE_PATTERN } from "./reference";
export { paystackFeeKobo, grossUpForFees, feesToCoverKobo, netAfterFeesKobo } from "./fees";
export { paystack, createPlan, getSubscriptionManageLink, isPaystackConfigured, PAYSTACK_CHANNELS } from "./paystack";
export { servicefabric, isServiceFabricConfigured } from "./servicefabric";
export { verifyPaystackSignature } from "./signature";

/**
 * The active card/transfer gateway, chosen by PAYMENT_PROVIDER
 * ("paystack" | "servicefabric", default "paystack"). Monthly giving always
 * needs Paystack (plans), so callers doing recurring use `paystack` directly.
 */
export function getProvider(): PaymentProvider {
  const choice = (process.env.PAYMENT_PROVIDER ?? "paystack").trim().toLowerCase();
  if (choice === "servicefabric") return servicefabric;
  if (choice !== "paystack") {
    console.warn(`[payments] Unknown PAYMENT_PROVIDER "${choice}", falling back to paystack`);
  }
  return paystack;
}
