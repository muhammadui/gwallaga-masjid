import { t } from "@/i18n/en";
import { CTA, EmailLayout, Facts, P, SmallLink } from "./layout";

const e = t.nikah.email;

export interface EmailBookingFacts {
  bookingRef: string;
  couple: string;
  when: string;
  fee: string;
  statusUrl: string;
}

function baseRows(b: EmailBookingFacts): [string, string][] {
  return [
    [e.reference, b.bookingRef],
    [t.nikah.pay.couple, b.couple],
    [e.when, b.when],
  ];
}

export function BookingReceivedEmail({ b, payUrl, holdUntil }: { b: EmailBookingFacts; payUrl: string; holdUntil: string }) {
  return (
    <EmailLayout preview={e.received.body} heading={e.received.heading}>
      <P>{e.received.body}</P>
      <Facts rows={[...baseRows(b), [e.fee, b.fee], [t.nikah.admin.expires, holdUntil]]} />
      <CTA href={payUrl}>{e.received.cta}</CTA>
      <SmallLink href={b.statusUrl}>{e.viewBooking}</SmallLink>
    </EmailLayout>
  );
}

export function PaymentReceivedEmail({ b, amount }: { b: EmailBookingFacts; amount: string }) {
  return (
    <EmailLayout preview={e.paid.body} heading={e.paid.heading}>
      <P>{e.paid.body}</P>
      <Facts rows={[...baseRows(b), [e.fee, amount]]} />
      <CTA href={b.statusUrl}>{e.viewBooking}</CTA>
    </EmailLayout>
  );
}

export function BookingConfirmedEmail({ b }: { b: EmailBookingFacts }) {
  return (
    <EmailLayout preview={e.confirmed.body} heading={e.confirmed.heading}>
      <P>{e.confirmed.body}</P>
      <Facts rows={baseRows(b)} />
      <CTA href={b.statusUrl}>{e.viewBooking}</CTA>
    </EmailLayout>
  );
}

export function BookingRescheduledEmail({ b, previous }: { b: EmailBookingFacts; previous: string }) {
  return (
    <EmailLayout preview={e.rescheduled.body} heading={e.rescheduled.heading}>
      <P>{e.rescheduled.body}</P>
      <Facts rows={[...baseRows(b), [e.rescheduled.previous, previous]]} />
      <CTA href={b.statusUrl}>{e.viewBooking}</CTA>
    </EmailLayout>
  );
}

export function BookingCancelledEmail({ b, reason }: { b: EmailBookingFacts; reason: string }) {
  return (
    <EmailLayout preview={e.cancelled.body} heading={e.cancelled.heading}>
      <P>{e.cancelled.body}</P>
      <Facts rows={[...baseRows(b), [e.cancelled.reason, reason]]} />
      <SmallLink href={b.statusUrl}>{e.viewBooking}</SmallLink>
    </EmailLayout>
  );
}

export function CertificateEmail({ b, certificateNo, verifyUrl }: { b: EmailBookingFacts; certificateNo: string; verifyUrl: string }) {
  return (
    <EmailLayout preview={e.certificate.body} heading={e.certificate.heading}>
      <P>{e.certificate.body}</P>
      <Facts rows={[[t.nikah.status.certificateNo, certificateNo], [t.nikah.pay.couple, b.couple], [e.when, b.when]]} />
      <CTA href={verifyUrl}>{e.certificate.verify}</CTA>
      <SmallLink href={b.statusUrl}>{e.viewBooking}</SmallLink>
    </EmailLayout>
  );
}

export function TransferClaimEmail({ b, reference, amount, adminUrl }: { b: EmailBookingFacts; reference: string; amount: string; adminUrl: string }) {
  return (
    <EmailLayout preview={e.transferClaim.body} heading={e.transferClaim.heading}>
      <P>{e.transferClaim.body}</P>
      <Facts rows={[[t.nikah.pay.transferRef, reference], [t.nikah.pay.transferAmount, amount], ...baseRows(b)]} />
      <CTA href={adminUrl}>{e.transferClaim.open}</CTA>
    </EmailLayout>
  );
}
