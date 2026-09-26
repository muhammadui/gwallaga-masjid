"use server";

import { redirect } from "next/navigation";
import { t } from "@/i18n/en";
import { prisma, Prisma } from "@/lib/db";
import {
  createPlan,
  feesToCoverKobo,
  getProvider,
  getSubscriptionManageLink,
  isPaystackConfigured,
  makeReference,
  paystack,
  PaymentConfigError,
  PaymentGatewayError,
  type PaymentProvider,
} from "@/lib/payments";
import { absoluteUrl } from "@/lib/utils";
import { resolveCampaignForGift } from "@/lib/donations/campaigns";
import { nairaToKobo } from "@/lib/donations/giving";
import {
  bankTransferDonationSchema,
  fieldErrors,
  onlineDonationSchema,
  type DonationInput,
} from "@/lib/validation/donation";
import { sendManageLinkEmail } from "@/lib/donations/receipt";

export type DonateActionState =
  | { status: "idle" }
  | {
      status: "error";
      kind: "validation" | "not_configured" | "gateway" | "campaign";
      message: string;
      fieldErrors?: Record<string, string>;
    };

const d = t.donate;

function validationError(error: Parameters<typeof fieldErrors>[0]): DonateActionState {
  return { status: "error", kind: "validation", message: d.form.genericError, fieldErrors: fieldErrors(error) };
}

const campaignMissing: DonateActionState = {
  status: "error",
  kind: "campaign",
  message: d.errors.campaignNotFound,
  fieldErrors: { campaignSlug: d.errors.campaignNotFound },
};

/**
 * Online gift: create the Donation (INITIATED) before redirecting to the
 * gateway; the webhook and /donate/callback both settle it by reference.
 * Monthly gifts always use Paystack (plans).
 */
export async function startDonation(input: DonationInput): Promise<DonateActionState> {
  const parsed = onlineDonationSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const v = parsed.data;

  const target = await resolveCampaignForGift(v.purpose, v.campaignSlug);
  if (!target) return campaignMissing;

  const monthly = v.frequency === "MONTHLY";
  const provider: PaymentProvider = monthly ? paystack : getProvider();
  const notConfigured: DonateActionState = {
    status: "error",
    kind: "not_configured",
    message: d.form.notConfiguredBody,
  };
  // Fail fast (no orphan rows) when the chosen gateway has no keys.
  if (provider.id === "PAYSTACK" && !isPaystackConfigured()) return notConfigured;

  const netKobo = nairaToKobo(v.amountNaira);
  const feesCoveredKobo = v.coverFees ? feesToCoverKobo(netKobo) : 0;
  const chargeKobo = netKobo + feesCoveredKobo;
  const reference = makeReference("DN");

  let authorizationUrl: string;
  let donationId: string | null = null;
  try {
    const plan = monthly ? await createPlan(chargeKobo) : undefined;
    const donation = await prisma.donation.create({
      data: {
        reference,
        purpose: target.purpose,
        campaignId: target.campaignId,
        amountKobo: netKobo,
        feesCoveredKobo,
        frequency: v.frequency,
        donorName: v.donorName ?? null,
        donorEmail: v.donorEmail!,
        donorPhone: v.donorPhone ?? null,
        anonymous: v.anonymous,
        provider: provider.id,
        status: "INITIATED",
        paystackPlanCode: plan ?? null,
      },
      select: { id: true },
    });
    donationId = donation.id;

    const init = await provider.initialize({
      amountKobo: chargeKobo,
      email: v.donorEmail!,
      reference,
      callbackUrl: absoluteUrl("/donate/callback"),
      metadata: {
        kind: "donation",
        id: donation.id,
        purpose: target.purpose,
        payerName: v.anonymous ? undefined : v.donorName,
        payerPhone: v.donorPhone,
        narration: `${d.purposes[target.purpose]} · ${reference}`,
      },
      plan,
    });
    authorizationUrl = init.authorizationUrl;
    if (init.providerRef) {
      await prisma.donation.update({ where: { id: donation.id }, data: { providerRef: init.providerRef } });
    }
  } catch (err) {
    if (donationId) {
      await prisma.donation
        .update({
          where: { id: donationId },
          data: { status: "FAILED", raw: { error: err instanceof Error ? err.message : String(err) } as Prisma.InputJsonValue },
        })
        .catch(() => undefined);
    }
    if (err instanceof PaymentConfigError) return notConfigured;
    console.error("[donate] gateway initialize failed", err instanceof PaymentGatewayError ? err.message : err);
    return { status: "error", kind: "gateway", message: d.form.gatewayErrorBody };
  }

  redirect(authorizationUrl);
}

/** Manual bank transfer: record the pledge (PENDING_TRANSFER) and show the account + reference. */
export async function startBankTransferDonation(input: DonationInput): Promise<DonateActionState> {
  const parsed = bankTransferDonationSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const v = parsed.data;

  const target = await resolveCampaignForGift(v.purpose, v.campaignSlug);
  if (!target) return campaignMissing;

  const reference = makeReference("BT");
  await prisma.donation.create({
    data: {
      reference,
      purpose: target.purpose,
      campaignId: target.campaignId,
      amountKobo: nairaToKobo(v.amountNaira),
      feesCoveredKobo: 0,
      frequency: "ONE_OFF",
      donorName: v.donorName ?? null,
      donorEmail: v.donorEmail ?? null,
      donorPhone: v.donorPhone ?? null,
      anonymous: v.anonymous,
      provider: "BANK_TRANSFER",
      status: "PENDING_TRANSFER",
    },
  });
  redirect(`/donate/transfer/${encodeURIComponent(reference)}`);
}

export type ManageLinkState = { status: "idle" | "sent" | "failed" };

/**
 * Email the donor a Paystack "manage subscription" link. The link is only
 * ever sent to the email on file, never shown on the (shareable) page.
 */
export async function emailManageLink(reference: string, _prev: ManageLinkState): Promise<ManageLinkState> {
  void _prev;
  const donation = await prisma.donation.findUnique({
    where: { reference },
    select: { frequency: true, paystackSubscriptionCode: true, donorEmail: true },
  });
  if (!donation || donation.frequency !== "MONTHLY" || !donation.paystackSubscriptionCode || !donation.donorEmail) {
    return { status: "failed" };
  }
  try {
    const link = await getSubscriptionManageLink(donation.paystackSubscriptionCode);
    const ok = await sendManageLinkEmail(donation.donorEmail, link);
    return { status: ok ? "sent" : "failed" };
  } catch (e) {
    console.error("[donate] manage link failed", e);
    return { status: "failed" };
  }
}
