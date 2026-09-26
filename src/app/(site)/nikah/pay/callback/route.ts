import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getProvider, paystack, servicefabric } from "@/lib/payments";
import { settleNikahPayment } from "@/lib/nikah/settle";
import { payPath, statusPath } from "@/lib/nikah/token";

/**
 * Gateway return URL. Verifies the transaction server-side, settles it
 * idempotently (the webhook may already have), then sends the payer to the
 * booking's tokenised status page (or back to the pay page if unconfirmed).
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const reference = params.get("reference") ?? params.get("trxref");
  const home = new URL("/nikah", request.nextUrl);
  if (!reference) return Response.redirect(home, 303);

  const payment = await prisma.payment.findUnique({
    where: { reference },
    select: { provider: true, providerRef: true, booking: { select: { bookingRef: true } } },
  });
  if (!payment || payment.provider === "BANK_TRANSFER") return Response.redirect(home, 303);

  const provider = payment.provider === "SERVICEFABRIC" ? servicefabric : payment.provider === "PAYSTACK" ? paystack : getProvider();
  let paid = false;
  try {
    const verification = await provider.verify(payment.provider === "SERVICEFABRIC" ? (payment.providerRef ?? reference) : reference);
    const outcome = await settleNikahPayment(reference, verification);
    paid = outcome === "settled" || outcome === "duplicate";
  } catch (err) {
    console.error("[nikah] payment callback verify failed", err);
  }

  const ref = payment.booking.bookingRef;
  const target = paid ? statusPath(ref) : `${payPath(ref)}&unconfirmed=1`;
  return Response.redirect(new URL(target, request.nextUrl), 303);
}
