import "server-only";
import { t } from "@/i18n/en";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { absoluteUrl, formatNaira } from "@/lib/utils";
import { firstName } from "./giving";
import { DonationReceiptEmail, ManageSubscriptionEmail } from "@/emails/donation-receipt";

export function formatReceiptDate(d: Date): string {
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "long", timeStyle: "short", timeZone: "Africa/Lagos" }).format(d);
}

/** Purpose label, using the campaign title for campaign gifts. */
export function purposeLabel(purpose: keyof typeof t.donate.purposes, campaignTitle?: string | null): string {
  return purpose === "CAMPAIGN" && campaignTitle ? campaignTitle : t.donate.purposes[purpose];
}

/**
 * Email the donor their receipt for a SUCCESS donation. No-op (ok) when the
 * donor left no email. Never throws.
 */
export async function sendDonationReceipt(reference: string): Promise<boolean> {
  try {
    const d = await prisma.donation.findUnique({
      where: { reference },
      include: { campaign: { select: { title: true } } },
    });
    if (!d || d.status !== "SUCCESS" || !d.donorEmail) return false;
    const amount = formatNaira(d.amountKobo);
    const result = await sendEmail({
      to: d.donorEmail,
      subject: t.donate.email.subject(amount),
      react: (
        <DonationReceiptEmail
          greetingName={d.anonymous ? undefined : firstName(d.donorName) || undefined}
          amount={amount}
          feesCovered={d.feesCoveredKobo > 0 ? formatNaira(d.feesCoveredKobo, { decimals: true }) : undefined}
          purpose={purposeLabel(d.purpose, d.campaign?.title)}
          date={formatReceiptDate(d.paidAt ?? d.updatedAt)}
          reference={d.reference}
          method={t.donate.methods[d.provider]}
          monthly={d.frequency === "MONTHLY"}
          receiptUrl={absoluteUrl(`/donate/thank-you/${encodeURIComponent(d.reference)}`)}
        />
      ),
    });
    return result.ok;
  } catch (e) {
    console.error("[donation-receipt] failed", e);
    return false;
  }
}

/** Email a Paystack manage-subscription link to the donor on file. */
export async function sendManageLinkEmail(to: string, link: string): Promise<boolean> {
  const r = await sendEmail({ to, subject: t.donate.email.manageSubject, react: <ManageSubscriptionEmail link={link} /> });
  return r.ok;
}
