import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { t } from "@/i18n/en";
import { claimBankTransfer, startBankTransfer, startNikahPayment } from "@/actions/nikah-booking";
import { getBankAccount, getSiteSettings } from "@/lib/settings";
import { formatNaira } from "@/lib/utils";
import { getPublicBooking } from "@/lib/nikah/access";
import { fill } from "@/lib/nikah/format";
import { acceptsPayment } from "@/lib/nikah/state";
import { formatLagosDateTime, formatLagosShort } from "@/lib/nikah/time";
import { statusPath } from "@/lib/nikah/token";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";
import { Section } from "@/components/ui/section";
import { ActionButton, CopyButton, PayOnlineButton } from "./pay-actions";

const p = t.nikah.pay;

export const metadata: Metadata = { title: p.eyebrow, robots: { index: false, follow: false } };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <Section spacing="none" className="pb-(--section-y) pt-[calc(var(--header-h)+clamp(2.5rem,6vw,5rem))]">
      <Container>{children}</Container>
    </Section>
  );
}

function Message({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <Shell>
      <div className="max-w-[40rem]">
        <Eyebrow>{p.eyebrow}</Eyebrow>
        <Heading as="h1" size="md" className="mt-6">
          {title}
        </Heading>
        <p className="mt-6 text-lede text-muted">{body}</p>
        <div className="mt-10 flex flex-wrap gap-3">{children}</div>
      </div>
    </Shell>
  );
}

export default async function NikahPayPage({ params, searchParams }: PageProps<"/nikah/pay/[bookingRef]">) {
  const { bookingRef } = await params;
  const sp = await searchParams;
  const token = typeof sp.t === "string" ? sp.t : "";
  const booking = await getPublicBooking(bookingRef, token);

  if (!booking) {
    return (
      <Message title={t.nikah.lookup.title} body={p.invalid}>
        <Button asChild icon>
          <Link href="/nikah/lookup">{t.nikah.status.lookupCta}</Link>
        </Button>
      </Message>
    );
  }
  if (!acceptsPayment(booking.status)) redirect(statusPath(booking.bookingRef));
  if (booking.status === "EXPIRED") {
    return (
      <Message title={t.status.EXPIRED} body={p.expired}>
        <Button asChild icon>
          <Link href="/nikah/book">{p.bookAgain}</Link>
        </Button>
      </Message>
    );
  }

  const [bank, site] = await Promise.all([getBankAccount(), getSiteSettings()]);
  const ref = booking.bookingRef;
  const transfer = booking.payments.find((x) => x.provider === "BANK_TRANSFER" && x.status === "INITIATED");
  const claimedAt = (transfer?.raw as { claimedAt?: string } | null)?.claimedAt;
  const unconfirmed = sp.unconfirmed === "1";

  return (
    <Shell>
      <div className="grid gap-14 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-5">
          <Eyebrow>{p.eyebrow}</Eyebrow>
          <Heading as="h1" size="lg" className="mt-6 max-w-[12ch]">
            {p.title}
          </Heading>
          <p className="mt-6 text-lede text-muted">
            {fill(p.lede, { time: booking.expiresAt ? formatLagosDateTime(booking.expiresAt) : "" })}
          </p>
          {unconfirmed ? (
            <p role="status" className="mt-6 rounded-xl bg-clay/[0.08] px-4 py-3 text-[0.875rem] leading-relaxed">
              {p.callbackFailed}
            </p>
          ) : null}

          <dl className="mt-12 hairline-t">
            {[
              [p.ref, ref],
              [p.couple, `${booking.groomName} & ${booking.brideName}`],
              [p.when, formatLagosDateTime(booking.scheduledAt)],
            ].map(([k, v]) => (
              <div key={k} className="grid gap-1 hairline-b py-4 sm:grid-cols-[9rem_1fr]">
                <dt className="text-[0.8125rem] text-muted">{k}</dt>
                <dd className="text-[0.9375rem]">{v}</dd>
              </div>
            ))}
            <div className="flex items-baseline justify-between hairline-b py-5">
              <dt className="text-[0.8125rem] text-muted">{p.fee}</dt>
              <dd className="font-display text-display-sm tabular-nums">{formatNaira(booking.feeKobo)}</dd>
            </div>
          </dl>
          <Link href={statusPath(ref)} className="mt-6 inline-block text-[0.875rem] text-accent underline underline-offset-4">
            {p.viewStatus}
          </Link>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-6 lg:col-start-7">
          {/* Online */}
          <div className="rounded-[2rem] bg-ink/[0.04] p-1.5 ring-1 ring-line">
            <section className="rounded-[calc(2rem-0.375rem)] bg-surface px-7 py-9 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:px-10" aria-labelledby="online-title">
              <p className="text-eyebrow uppercase text-muted">01</p>
              <h2 id="online-title" className="mt-4 font-display text-display-sm">
                {p.onlineTitle}
              </h2>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">{p.onlineBody}</p>
              <div className="mt-8">
                <PayOnlineButton action={startNikahPayment.bind(null, ref, token)} />
              </div>
            </section>
          </div>

          {/* Bank transfer */}
          <div className="rounded-[2rem] bg-ink/[0.04] p-1.5 ring-1 ring-line">
            <section className="rounded-[calc(2rem-0.375rem)] bg-surface px-7 py-9 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:px-10" aria-labelledby="transfer-title">
              <p className="text-eyebrow uppercase text-muted">02</p>
              <h2 id="transfer-title" className="mt-4 font-display text-display-sm">
                {p.transferTitle}
              </h2>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">{p.transferBody}</p>

              {!transfer ? (
                <div className="mt-8">
                  <ActionButton action={startBankTransfer.bind(null, ref, token)} label={p.transferCta} />
                </div>
              ) : !bank ? (
                <p className="mt-8 text-[0.9375rem] leading-relaxed">
                  {site.phone ? fill(p.noAccount, { phone: site.phone }) : p.noAccountNoPhone}
                </p>
              ) : (
                <>
                  <dl className="mt-8 hairline-t">
                    {[
                      [t.footer.bank, bank.bankName],
                      [t.footer.accountName, bank.accountName],
                      [t.footer.accountNumber, bank.accountNumber],
                      [p.transferAmount, formatNaira(booking.feeKobo)],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-baseline justify-between gap-4 hairline-b py-3.5">
                        <dt className="text-[0.8125rem] text-muted">{k}</dt>
                        <dd className="flex items-center gap-3 text-right text-[0.9375rem] tabular-nums">
                          {v}
                          {k === t.footer.accountNumber ? <CopyButton value={bank.accountNumber} /> : null}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-6 rounded-2xl bg-limestone-deep/70 px-5 py-4 ring-1 ring-inset ring-(--hairline-gold)/50">
                    <p className="text-eyebrow uppercase text-muted">{p.transferRef}</p>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                      <p className="font-mono text-[1.0625rem] tracking-wide">{transfer.reference}</p>
                      <CopyButton value={transfer.reference} />
                    </div>
                  </div>
                  <div className="mt-8">
                    {claimedAt ? (
                      <p role="status" className="text-[0.9375rem] leading-relaxed">
                        {p.claimed} <span className="text-muted">{fill(p.claimedAt, { time: formatLagosShort(new Date(claimedAt)) })}</span>
                      </p>
                    ) : (
                      <ActionButton action={claimBankTransfer.bind(null, ref, token)} label={p.claimCta} variant="primary" />
                    )}
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
      </div>
    </Shell>
  );
}
