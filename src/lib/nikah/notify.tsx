import "server-only";
import type { ReactElement } from "react";
import { t } from "@/i18n/en";
import type { NikahBooking } from "@/lib/db";
import { sendEmail, type EmailAttachment } from "@/lib/email";
import { getSiteSettings } from "@/lib/settings";
import { absoluteUrl, formatNaira } from "@/lib/utils";
import {
  BookingCancelledEmail,
  BookingConfirmedEmail,
  BookingReceivedEmail,
  BookingRescheduledEmail,
  CertificateEmail,
  PaymentReceivedEmail,
  TransferClaimEmail,
  type EmailBookingFacts,
} from "@/emails/nikah/templates";
import { certificateSlug, fill } from "./format";
import { formatLagosDateTime } from "./time";
import { payPath, statusPath } from "./token";

/**
 * Nikah transactional emails. Each helper resolves recipients from the
 * booking (groom always, bride when she gave an email) and never throws:
 * sendEmail() reports failures in its result, which we log.
 */
const e = t.nikah.email;

type B = Pick<NikahBooking, "id" | "bookingRef" | "groomName" | "brideName" | "groomEmail" | "brideEmail" | "scheduledAt" | "feeKobo" | "expiresAt">;

function recipients(b: B): string[] {
  return [...new Set([b.groomEmail, b.brideEmail].filter((x): x is string => !!x && x.includes("@")))];
}

function facts(b: B): EmailBookingFacts {
  return {
    bookingRef: b.bookingRef,
    couple: `${b.groomName} & ${b.brideName}`,
    when: formatLagosDateTime(b.scheduledAt),
    fee: formatNaira(b.feeKobo),
    statusUrl: absoluteUrl(statusPath(b.bookingRef)),
  };
}

async function send(to: string[], subject: string, react: ReactElement, extra?: { attachments?: EmailAttachment[] }) {
  if (to.length === 0) return { ok: false as const, error: "no-recipient" };
  const r = await sendEmail({ to, subject, react, attachments: extra?.attachments });
  if (!r.ok) console.error(`[nikah-email] "${subject}" failed: ${r.error}`);
  return r;
}

export function emailBookingReceived(b: B) {
  return send(
    recipients(b),
    fill(e.received.subject, { ref: b.bookingRef }),
    <BookingReceivedEmail b={facts(b)} payUrl={absoluteUrl(payPath(b.bookingRef))} holdUntil={b.expiresAt ? formatLagosDateTime(b.expiresAt) : "48h"} />,
  );
}

export function emailPaymentReceived(b: B, amountKobo: number) {
  return send(recipients(b), fill(e.paid.subject, { ref: b.bookingRef }), <PaymentReceivedEmail b={facts(b)} amount={formatNaira(amountKobo)} />);
}

export function emailBookingConfirmed(b: B) {
  return send(recipients(b), fill(e.confirmed.subject, { ref: b.bookingRef }), <BookingConfirmedEmail b={facts(b)} />);
}

export function emailBookingRescheduled(b: B, previous: Date) {
  return send(
    recipients(b),
    fill(e.rescheduled.subject, { ref: b.bookingRef }),
    <BookingRescheduledEmail b={facts(b)} previous={formatLagosDateTime(previous)} />,
  );
}

export function emailBookingCancelled(b: B, reason: string) {
  return send(recipients(b), fill(e.cancelled.subject, { ref: b.bookingRef }), <BookingCancelledEmail b={facts(b)} reason={reason} />);
}

export function emailCertificate(b: B, certificateNo: string, pdf: Uint8Array) {
  return send(
    recipients(b),
    fill(e.certificate.subject, { no: certificateNo }),
    <CertificateEmail b={facts(b)} certificateNo={certificateNo} verifyUrl={absoluteUrl(`/verify/${certificateSlug(certificateNo)}`)} />,
    { attachments: [{ filename: `nikah-certificate-${certificateSlug(certificateNo)}.pdf`, content: pdf, contentType: "application/pdf" }] },
  );
}

/** Tell the office a couple says they paid by transfer (SiteSettings.email). */
export async function emailOfficeTransferClaim(b: B, reference: string, amountKobo: number) {
  const settings = await getSiteSettings();
  const to = settings.email ?? process.env.ADMIN_EMAIL ?? null;
  if (!to) return { ok: false as const, error: "no-office-email" };
  return send(
    [to],
    fill(e.transferClaim.subject, { ref: b.bookingRef }),
    <TransferClaimEmail b={facts(b)} reference={reference} amount={formatNaira(amountKobo)} adminUrl={absoluteUrl(`/admin/nikah/${b.id}`)} />,
  );
}
