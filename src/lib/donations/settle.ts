import type { VerifyResult } from "@/lib/payments/provider";
import type { SettleOutcome, WebhookRepo } from "@/lib/payments/webhook";

/**
 * Settle a donation from a gateway verification (the /donate/callback path).
 * Uses the SAME repository transitions as the Paystack webhook, so whichever
 * arrives first wins and the other is a no-op:
 *   - Donation → SUCCESS and Campaign.raisedKobo += amountKobo only if the
 *     row is not already SUCCESS (conditional update in a transaction).
 *   - Under-payment or a failed verification → FAILED (never downgrades SUCCESS).
 *   - Pending verifications change nothing; the webhook will settle later.
 */

export type DonationSettleRepo = Pick<WebhookRepo, "findDonation" | "settleDonation" | "failDonation">;

export type DonationSettleOutcome = SettleOutcome | "pending" | "failed" | "amount_mismatch";

let defaultRepo: Promise<DonationSettleRepo> | null = null;
function loadDefaultRepo(): Promise<DonationSettleRepo> {
  defaultRepo ??= import("@/lib/payments/webhook-repo").then((m) => m.prismaWebhookRepo);
  return defaultRepo;
}

export async function settleDonation(
  reference: string,
  verification: VerifyResult,
  repo?: DonationSettleRepo,
): Promise<DonationSettleOutcome> {
  const r = repo ?? (await loadDefaultRepo());
  const expected = await r.findDonation(reference);
  if (!expected) return "not_found";

  if (verification.status === "pending") return "pending";
  if (verification.status === "failed") {
    await r.failDonation(reference, verification.raw);
    return "failed";
  }
  if (!Number.isInteger(verification.amountKobo) || verification.amountKobo < expected.expectedKobo) {
    await r.failDonation(reference, verification.raw);
    return "amount_mismatch";
  }
  return r.settleDonation(reference, {
    amountKobo: verification.amountKobo,
    channel: verification.channel ?? null,
    paidAt: verification.paidAt ?? new Date(),
    raw: verification.raw,
  });
}
