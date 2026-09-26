import type { Metadata } from "next";
import Link from "next/link";
import { t } from "@/i18n/en";
import { cn, formatNaira } from "@/lib/utils";
import { getPublicBooking } from "@/lib/nikah/access";
import { certificateSlug } from "@/lib/nikah/format";
import { readJournal, sadakiDisplay } from "@/lib/nikah/journal";
import { acceptsPayment, timelineIndex } from "@/lib/nikah/state";
import { formatLagosDateTime, formatLagosShort } from "@/lib/nikah/time";
import { payPath, signBookingToken } from "@/lib/nikah/token";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";
import { Section } from "@/components/ui/section";

const s = t.nikah.status;

export const metadata: Metadata = { title: t.nikah.meta.statusTitle, robots: { index: false, follow: false } };

export default async function NikahStatusPage({ params, searchParams }: PageProps<"/nikah/[bookingRef]">) {
  const { bookingRef } = await params;
  const sp = await searchParams;
  const token = typeof sp.t === "string" ? sp.t : "";
  const booking = await getPublicBooking(bookingRef, token);

  if (!booking) {
    return (
      <Section spacing="none" className="pb-(--section-y) pt-[calc(var(--header-h)+clamp(3rem,8vw,7rem))]">
        <Container>
          <div className="max-w-[40rem]">
            <Eyebrow>{s.eyebrow}</Eyebrow>
            <Heading as="h1" size="md" className="mt-6">
              {t.nikah.lookup.title}
            </Heading>
            <p className="mt-6 text-lede text-muted">{s.invalidLink}</p>
            <Button asChild icon className="mt-10">
              <Link href="/nikah/lookup">{s.lookupCta}</Link>
            </Button>
          </div>
        </Container>
      </Section>
    );
  }

  const journal = readJournal(booking.checklist);
  const paidAt = booking.payments.find((p) => p.status === "SUCCESS")?.paidAt ?? null;
  const reached = timelineIndex(booking.status);
  const steps = [
    { label: s.steps.received, at: booking.createdAt },
    { label: s.steps.paid, at: paidAt },
    { label: s.steps.confirmed, at: journal.confirmedAt ? new Date(journal.confirmedAt) : null },
    { label: s.steps.solemnized, at: booking.solemnizedAt },
  ];
  const cert = booking.certificate && !booking.certificate.revokedAt ? booking.certificate : null;
  const tok = signBookingToken(booking.bookingRef);
  const ended = booking.status === "CANCELLED" || booking.status === "EXPIRED";

  return (
    <Section spacing="none" className="pb-(--section-y) pt-[calc(var(--header-h)+clamp(2.5rem,6vw,5rem))]" aria-labelledby="status-title">
      <Container>
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <Eyebrow>
              {s.eyebrow} · <span className="font-mono normal-case tracking-normal">{booking.bookingRef}</span>
            </Eyebrow>
            <Heading as="h1" id="status-title" size="lg" className="mt-6">
              {t.status[booking.status]}
            </Heading>
            <p className="mt-4 text-lede text-muted">{formatLagosDateTime(booking.scheduledAt)}</p>

            <div className="mt-12">
              <h2 className="text-eyebrow uppercase text-muted">{s.nextTitle}</h2>
              <p className="mt-4 max-w-[46ch] text-[1rem] leading-relaxed">{s.next[booking.status]}</p>
              {booking.status === "CANCELLED" && journal.cancelReason ? (
                <p className="mt-3 text-[0.9375rem] text-muted">
                  {s.reason}: {journal.cancelReason}
                </p>
              ) : null}
              <div className="mt-8 flex flex-wrap gap-3">
                {acceptsPayment(booking.status) && booking.status !== "EXPIRED" ? (
                  <Button asChild icon>
                    <Link href={payPath(booking.bookingRef)}>{s.payNow}</Link>
                  </Button>
                ) : null}
                {booking.status === "EXPIRED" ? (
                  <Button asChild icon>
                    <Link href="/nikah/book">{t.nikah.pay.bookAgain}</Link>
                  </Button>
                ) : null}
              </div>
            </div>

            {booking.status === "SOLEMNIZED" && cert ? (
              <div className="mt-12 rounded-[2rem] bg-ink/[0.04] p-1.5 ring-1 ring-line">
                <div className="rounded-[calc(2rem-0.375rem)] bg-surface px-7 py-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                  <p className="text-eyebrow uppercase text-muted">{s.certificateNo}</p>
                  <p className="mt-2 font-mono text-[1.0625rem]">{cert.certificateNo}</p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button asChild icon>
                      <a href={`/nikah/${booking.bookingRef}/certificate.pdf?t=${tok}`}>{s.certificate}</a>
                    </Button>
                    <Button asChild variant="secondary">
                      <Link href={`/verify/${certificateSlug(cert.certificateNo)}`}>{s.verifyLink}</Link>
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="lg:col-span-6 lg:col-start-7">
            <h2 className="text-eyebrow uppercase text-muted">{s.timeline}</h2>
            <ol className={cn("mt-6", ended && "opacity-60")}>
              {steps.map((step, i) => {
                const done = i <= reached && !!step.at;
                const current = i === reached;
                return (
                  <li key={step.label} className="grid grid-cols-[2.5rem_1fr] gap-4">
                    <div className="flex flex-col items-center">
                      <span
                        aria-hidden
                        className={cn(
                          "mt-1 inline-flex size-6 items-center justify-center rounded-full ring-1 ring-inset",
                          done ? "bg-accent ring-transparent" : "ring-line-strong",
                          current && "ring-4 ring-accent/15",
                        )}
                      >
                        {done ? <span className="size-1.5 rounded-full bg-accent-fg" /> : null}
                      </span>
                      {i < steps.length - 1 ? <span className={cn("my-1 w-px flex-1", i < reached ? "bg-accent" : "bg-line-strong")} /> : null}
                    </div>
                    <div className="pb-10">
                      <p className={cn("text-[1.0625rem]", done ? "font-medium" : "text-muted")}>{step.label}</p>
                      <p className="mt-1 text-[0.875rem] tabular-nums text-muted">{done && step.at ? formatLagosShort(step.at) : s.pending}</p>
                    </div>
                  </li>
                );
              })}
            </ol>

            <h2 className="mt-6 text-eyebrow uppercase text-muted">{s.details}</h2>
            <dl className="mt-4 hairline-t">
              {[
                [s.groom, booking.groomName],
                [s.bride, booking.brideName],
                [s.wali, `${booking.waliName} (${booking.waliRelationship})`],
                [s.witnesses, `${booking.witness1Name}, ${booking.witness2Name}`],
                [s.sadaki, `${formatNaira(booking.sadakiAmountKobo)} · ${t.nikah.sadakiStatus[sadakiDisplay(booking)]}`],
              ].map(([k, v]) => (
                <div key={k} className="grid gap-1 hairline-b py-3.5 sm:grid-cols-[8rem_1fr]">
                  <dt className="text-[0.8125rem] text-muted">{k}</dt>
                  <dd className="text-[0.9375rem]">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Container>
    </Section>
  );
}
