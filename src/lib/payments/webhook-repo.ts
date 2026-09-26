import { Prisma, prisma } from "@/lib/db";
import type { SettleData, SettleOutcome, WebhookRepo } from "./webhook";

const json = (v: unknown) => v as Prisma.InputJsonValue;

/** Prisma-backed WebhookRepo. Conditional updates make every settle idempotent. */
export const prismaWebhookRepo: WebhookRepo = {
  async findNikahPayment(reference) {
    const p = await prisma.payment.findUnique({ where: { reference }, select: { amountKobo: true } });
    return p ? { expectedKobo: p.amountKobo } : null;
  },

  async settleNikah(reference, data: SettleData): Promise<SettleOutcome> {
    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { reference }, select: { bookingId: true } });
      if (!payment) return "not_found";
      const { count } = await tx.payment.updateMany({
        where: { reference, status: { not: "SUCCESS" } },
        data: { status: "SUCCESS", paidAt: data.paidAt, channel: data.channel, raw: json(data.raw) },
      });
      if (count === 0) return "duplicate";
      await tx.nikahBooking.updateMany({
        where: { id: payment.bookingId, status: { in: ["PENDING_PAYMENT", "EXPIRED"] } },
        data: { status: "PAID", expiresAt: null },
      });
      return "settled";
    });
  },

  async failNikah(reference, raw) {
    await prisma.payment.updateMany({
      where: { reference, status: { not: "SUCCESS" } },
      data: { status: "FAILED", raw: json(raw) },
    });
  },

  async findDonation(reference) {
    const d = await prisma.donation.findUnique({
      where: { reference },
      select: { amountKobo: true, feesCoveredKobo: true },
    });
    return d ? { expectedKobo: d.amountKobo + d.feesCoveredKobo } : null;
  },

  async settleDonation(reference, data): Promise<SettleOutcome> {
    return prisma.$transaction(async (tx) => {
      const d = await tx.donation.findUnique({
        where: { reference },
        select: { amountKobo: true, campaignId: true, frequency: true },
      });
      if (!d) return "not_found";
      const { count } = await tx.donation.updateMany({
        where: { reference, status: { not: "SUCCESS" } },
        data: {
          status: "SUCCESS",
          paidAt: data.paidAt,
          channel: data.channel,
          raw: json(data.raw),
          ...(d.frequency === "MONTHLY" ? { subscriptionActive: true } : {}),
        },
      });
      if (count === 0) return "duplicate";
      if (d.campaignId) {
        await tx.campaign.update({
          where: { id: d.campaignId },
          data: { raisedKobo: { increment: d.amountKobo } },
        });
      }
      return "settled";
    });
  },

  async failDonation(reference, raw) {
    await prisma.donation.updateMany({
      where: { reference, status: { not: "SUCCESS" } },
      data: { status: "FAILED", raw: json(raw) },
    });
  },

  async findRecurringParent(planCode, email) {
    return prisma.donation.findFirst({
      where: {
        paystackPlanCode: planCode,
        donorEmail: { equals: email, mode: "insensitive" },
        frequency: "MONTHLY",
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, amountKobo: true, feesCoveredKobo: true },
    });
  },

  async createRecurringDonation(parentId, reference, data): Promise<SettleOutcome> {
    return prisma.$transaction(async (tx) => {
      const exists = await tx.donation.findUnique({ where: { reference }, select: { id: true } });
      if (exists) return "duplicate";
      const parent = await tx.donation.findUnique({ where: { id: parentId } });
      if (!parent) return "not_found";
      try {
        await tx.donation.create({
          data: {
            reference,
            purpose: parent.purpose,
            campaignId: parent.campaignId,
            amountKobo: parent.amountKobo,
            feesCoveredKobo: parent.feesCoveredKobo,
            frequency: "MONTHLY",
            donorName: parent.donorName,
            donorEmail: parent.donorEmail,
            donorPhone: parent.donorPhone,
            anonymous: parent.anonymous,
            provider: "PAYSTACK",
            status: "SUCCESS",
            channel: data.channel,
            paystackPlanCode: parent.paystackPlanCode,
            paystackSubscriptionCode: parent.paystackSubscriptionCode,
            paidAt: data.paidAt,
            raw: json(data.raw),
          },
        });
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return "duplicate";
        throw e;
      }
      if (parent.campaignId) {
        await tx.campaign.update({
          where: { id: parent.campaignId },
          data: { raisedKobo: { increment: parent.amountKobo } },
        });
      }
      return "settled";
    });
  },

  async attachSubscription({ planCode, email, subscriptionCode, emailToken }) {
    const already = await prisma.donation.count({ where: { paystackSubscriptionCode: subscriptionCode } });
    if (already > 0) return true;
    const target = await prisma.donation.findFirst({
      where: {
        paystackPlanCode: planCode,
        donorEmail: { equals: email, mode: "insensitive" },
        frequency: "MONTHLY",
        paystackSubscriptionCode: null,
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (!target) return false;
    await prisma.donation.update({
      where: { id: target.id },
      data: { paystackSubscriptionCode: subscriptionCode, paystackEmailToken: emailToken, subscriptionActive: true },
    });
    return true;
  },

  async setSubscriptionActive(subscriptionCode, active) {
    const { count } = await prisma.donation.updateMany({
      where: { paystackSubscriptionCode: subscriptionCode },
      data: { subscriptionActive: active },
    });
    return count;
  },
};
