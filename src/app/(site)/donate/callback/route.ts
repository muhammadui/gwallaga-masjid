import { prisma } from "@/lib/db";
import { paystack, servicefabric, type PaymentProvider } from "@/lib/payments";
import { settleDonation } from "@/lib/donations/settle";
import { sendDonationReceipt } from "@/lib/donations/receipt";

/**
 * Gateway return URL. Verifies the transaction server-side and settles it
 * with the same idempotent transition the webhook uses, then sends the
 * receipt (only on the call that actually settled it) and lands the donor on
 * their receipt. Verification failures never block the redirect: the
 * thank-you page shows a "confirming" state and the webhook settles later.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const reference = (url.searchParams.get("reference") ?? url.searchParams.get("trxref") ?? "").trim();
  const to = (path: string) => Response.redirect(new URL(path, url.origin), 303);
  if (!reference) return to("/donate");

  const donation = await prisma.donation.findUnique({
    where: { reference },
    select: { reference: true, provider: true, providerRef: true },
  });
  if (!donation) return to("/donate");

  const thankYou = `/donate/thank-you/${encodeURIComponent(donation.reference)}`;
  if (donation.provider === "BANK_TRANSFER") return to(`/donate/transfer/${encodeURIComponent(donation.reference)}`);

  try {
    const provider: PaymentProvider = donation.provider === "SERVICEFABRIC" ? servicefabric : paystack;
    const verification = await provider.verify(donation.provider === "SERVICEFABRIC" ? (donation.providerRef ?? reference) : reference);
    const outcome = await settleDonation(reference, verification);
    if (outcome === "settled") await sendDonationReceipt(reference);
  } catch (err) {
    console.error("[donate/callback] verify failed", reference, err instanceof Error ? err.message : err);
  }
  return to(thankYou);
}
