import "server-only";
import { Prisma, prisma } from "@/lib/db";
import type { VerifyResult } from "@/lib/payments";
import { prismaWebhookRepo } from "@/lib/payments/webhook-repo";
import { emailPaymentReceived } from "./notify";

export type SettleResult = "settled" | "duplicate" | "not_found" | "pending" | "failed" | "amount_mismatch";

/**
 * Settle a nikah Payment from a gateway verification (callback page). Uses the
 * same conditional, idempotent repository the Paystack webhook uses, so the
 * callback and the webhook can race safely: exactly one flips the row to
 * SUCCESS and the booking PENDING_PAYMENT/EXPIRED → PAID.
 *
 * Also sends the "Payment received" email once per payment (marked with
 * `raw.receiptEmailedAt`, which the webhook never overwrites after SUCCESS).
 */
export async function settleNikahPayment(reference: string, v: VerifyResult): Promise<SettleResult> {
  const expected = await prismaWebhookRepo.findNikahPayment(reference);
  if (!expected) return "not_found";

  if (v.status === "pending") return "pending";
  if (v.status === "failed") {
    await prismaWebhookRepo.failNikah(reference, v.raw);
    return "failed";
  }
  if (v.amountKobo < expected.expectedKobo) {
    await prismaWebhookRepo.failNikah(reference, v.raw);
    return "amount_mismatch";
  }

  const outcome = await prismaWebhookRepo.settleNikah(reference, {
    amountKobo: v.amountKobo,
    channel: v.channel ?? null,
    paidAt: v.paidAt ?? new Date(),
    raw: v.raw,
  });
  if (outcome === "settled" || outcome === "duplicate") await sendReceiptOnce(reference);
  return outcome;
}

/** Email the payment receipt unless this payment was already receipted. */
export async function sendReceiptOnce(reference: string): Promise<void> {
  const payment = await prisma.payment.findUnique({ where: { reference }, include: { booking: true } });
  if (!payment || payment.status !== "SUCCESS") return;
  const raw = (payment.raw && typeof payment.raw === "object" && !Array.isArray(payment.raw) ? payment.raw : {}) as Record<string, unknown>;
  if (raw.receiptEmailedAt) return;
  await prisma.payment.update({
    where: { id: payment.id },
    data: { raw: { ...raw, receiptEmailedAt: new Date().toISOString() } as Prisma.InputJsonValue },
  });
  await emailPaymentReceived(payment.booking, payment.amountKobo);
}
