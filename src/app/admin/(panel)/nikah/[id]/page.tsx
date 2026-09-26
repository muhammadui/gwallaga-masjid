import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { t } from "@/i18n/en";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { formatNaira } from "@/lib/utils";
import { certificateSlug, fill } from "@/lib/nikah/format";
import { CHECKLIST_KEYS, readJournal, sadakiDisplay } from "@/lib/nikah/journal";
import { canReschedule, canTransition, effectiveStatus } from "@/lib/nikah/state";
import { formatLagosDateTime, formatLagosShort, lagosHhmm, lagosYmd } from "@/lib/nikah/time";
import { displayPhone } from "@/lib/validation/nikah";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";
import { StatusPill } from "../status-pill";
import { CancelForm, CertificateActions, ConfirmButton, MarkReceivedButton, ProposeSlotForm, SolemnizePanel } from "./panels";

const a = t.nikah.admin;

export const metadata: Metadata = { title: a.booking };

function Block({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <section aria-labelledby={id} className="hairline-t py-8">
      <h2 id={id} className="text-eyebrow uppercase text-muted">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Facts({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid gap-x-8 sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k} className="py-2">
          <dt className="text-[0.75rem] text-muted">{k}</dt>
          <dd className="mt-0.5 text-[0.9375rem]">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function AdminNikahDetailPage({ params }: PageProps<"/admin/nikah/[id]">) {
  const { user } = await requireAdmin();
  const { id } = await params;
  const booking = await prisma.nikahBooking.findUnique({
    where: { id },
    include: {
      payments: { orderBy: { createdAt: "desc" } },
      certificate: { select: { certificateNo: true, issuedAt: true, revokedAt: true } },
    },
  });
  if (!booking) notFound();

  const lastOfficiant = await prisma.nikahBooking.findFirst({
    where: { officiantName: { not: null } },
    orderBy: { solemnizedAt: "desc" },
    select: { officiantName: true },
  });

  const status = effectiveStatus(booking);
  const journal = readJournal(booking.checklist);
  const f = t.nikah.form;
  const role = (user as { role?: string }).role;

  return (
    <div className="max-w-5xl">
      <Link href="/admin/nikah" className="text-[0.8125rem] text-muted underline-offset-4 hover:underline">
        ← {a.back}
      </Link>
      <div className="mt-6 flex flex-wrap items-start justify-between gap-6">
        <div>
          <Eyebrow>
            {a.booking} · <span className="font-mono normal-case tracking-normal">{booking.bookingRef}</span>
          </Eyebrow>
          <Heading as="h1" size="md" className="mt-5">
            {booking.groomName} <em>&amp;</em> {booking.brideName}
          </Heading>
          <p className="mt-3 text-[1.0625rem]">{formatLagosDateTime(booking.scheduledAt)}</p>
          <p className="mt-1 text-[0.8125rem] text-muted">
            {a.created} {formatLagosShort(booking.createdAt)}
            {status === "PENDING_PAYMENT" && booking.expiresAt ? ` · ${a.expires} ${formatLagosShort(booking.expiresAt)}` : ""}
          </p>
        </div>
        <StatusPill status={status} className="h-9 px-4 text-[0.8125rem]" />
      </div>

      {/* Actions */}
      {status !== "SOLEMNIZED" && status !== "CANCELLED" ? (
        <Block title={a.actions} id="actions">
          <div className="flex flex-wrap items-start gap-3">
            {canTransition(booking.status, "CONFIRMED") ? <ConfirmButton bookingId={booking.id} /> : null}
            {canReschedule(booking.status) ? (
              <ProposeSlotForm bookingId={booking.id} date={lagosYmd(booking.scheduledAt)} time={lagosHhmm(booking.scheduledAt)} />
            ) : null}
            <CancelForm bookingId={booking.id} />
          </div>
        </Block>
      ) : null}
      {status === "CANCELLED" && journal.cancelReason ? (
        <Block title={t.nikah.status.reason} id="reason">
          <p className="text-[0.9375rem]">{journal.cancelReason}</p>
        </Block>
      ) : null}

      {/* Payments */}
      <Block title={a.payments} id="payments">
        {booking.payments.length === 0 ? (
          <p className="text-[0.9375rem] text-muted">{a.noPayments}</p>
        ) : (
          <ul className="divide-y divide-line rounded-2xl ring-1 ring-line">
            {booking.payments.map((p) => {
              const claimedAt = (p.raw as { claimedAt?: string } | null)?.claimedAt;
              return (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                  <div>
                    <p className="text-[0.9375rem]">
                      {a.provider[p.provider]} · <span className="tabular-nums">{formatNaira(p.amountKobo)}</span> ·{" "}
                      <span className={p.status === "SUCCESS" ? "text-indigo" : p.status === "FAILED" ? "text-danger" : "text-muted"}>
                        {a.paymentStatus[p.status]}
                      </span>
                    </p>
                    <p className="mt-1 font-mono text-[0.75rem] text-muted">
                      {p.reference}
                      {p.channel ? ` · ${p.channel}` : ""}
                      {p.paidAt ? ` · ${formatLagosShort(p.paidAt)}` : ` · ${formatLagosShort(p.createdAt)}`}
                    </p>
                    {claimedAt && p.status !== "SUCCESS" ? (
                      <p className="mt-1 text-[0.8125rem] text-clay">{fill(a.claimed, { time: formatLagosShort(new Date(claimedAt)) })}</p>
                    ) : null}
                  </div>
                  {p.provider === "BANK_TRANSFER" && p.status === "INITIATED" && canTransition(booking.status, "PAID") ? (
                    <MarkReceivedButton paymentId={p.id} />
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Block>

      {/* Solemnize / certificate */}
      {booking.status === "SOLEMNIZED" ? (
        <Block title={a.certificate} id="certificate">
          {booking.certificate ? (
            <>
              <p className="font-mono text-[1.0625rem]">{booking.certificate.certificateNo}</p>
              <p className="mt-1 text-[0.8125rem] text-muted">
                {fill(a.issued, { time: formatLagosShort(booking.certificate.issuedAt) })}
                {booking.solemnizedAt ? ` · ${fill(a.solemnizedAt, { time: formatLagosShort(booking.solemnizedAt) })}` : ""}
                {booking.officiantName ? ` · ${booking.officiantName}` : ""}
              </p>
              {booking.certificate.revokedAt ? (
                <p className="mt-3 text-[0.875rem] text-danger">{fill(a.revokedOn, { time: formatLagosShort(booking.certificate.revokedAt) })}</p>
              ) : null}
              <div className="mt-6">
                <CertificateActions bookingId={booking.id} revoked={!!booking.certificate.revokedAt} canRevoke={role === "ADMIN"} />
              </div>
              <Link
                href={`/verify/${certificateSlug(booking.certificate.certificateNo)}`}
                target="_blank"
                className="mt-5 inline-block text-[0.8125rem] text-accent underline underline-offset-4"
              >
                {a.verifyPage}
              </Link>
            </>
          ) : (
            <CertificateActions bookingId={booking.id} revoked={false} canRevoke={false} />
          )}
          {journal.verification ? (
            <ul className="mt-8 flex flex-wrap gap-2">
              {CHECKLIST_KEYS.map((k) => (
                <li key={k} className="rounded-full bg-ink/[0.05] px-3 py-1 text-[0.75rem]">
                  ✓ {a.checklist[k]}
                </li>
              ))}
            </ul>
          ) : null}
        </Block>
      ) : status !== "CANCELLED" && status !== "EXPIRED" ? (
        <Block title={a.solemnize} id="solemnize">
          <SolemnizePanel bookingId={booking.id} officiant={lastOfficiant?.officiantName ?? ""} ready={booking.status === "CONFIRMED"} />
        </Block>
      ) : null}

      {/* Details */}
      <Block title={a.groom} id="groom">
        <Facts
          rows={[
            [f.groom.name, `${booking.groomName} (${a.age} ${booking.groomAge})`],
            [f.groom.phone, displayPhone(booking.groomPhone)],
            [f.groom.email, booking.groomEmail ?? "—"],
            [f.groom.address, booking.groomAddress],
          ]}
        />
      </Block>
      <Block title={a.bride} id="bride">
        <Facts
          rows={[
            [f.bride.name, `${booking.brideName} (${a.age} ${booking.brideAge})`],
            [f.bride.phone, booking.bridePhone ? displayPhone(booking.bridePhone) : "—"],
            [f.bride.email, booking.brideEmail ?? "—"],
            [f.bride.address, booking.brideAddress],
          ]}
        />
      </Block>
      <Block title={a.wali} id="wali">
        <Facts
          rows={[
            [f.wali.name, booking.waliName],
            [f.wali.relationship, booking.waliRelationship],
            [f.wali.phone, displayPhone(booking.waliPhone)],
          ]}
        />
      </Block>
      <Block title={a.witnesses} id="witnesses">
        <Facts
          rows={[
            [fill(f.witnesses.witness, { n: 1 }), `${booking.witness1Name} · ${displayPhone(booking.witness1Phone)}`],
            [fill(f.witnesses.witness, { n: 2 }), `${booking.witness2Name} · ${displayPhone(booking.witness2Phone)}`],
          ]}
        />
      </Block>
      <Block title={a.sadaki} id="sadaki">
        <Facts
          rows={[
            [f.sadaki.amount, formatNaira(booking.sadakiAmountKobo)],
            [f.sadaki.status, t.nikah.sadakiStatus[sadakiDisplay(booking)]],
            [a.notes, booking.notes ?? "—"],
            [t.nikah.pay.fee, formatNaira(booking.feeKobo)],
          ]}
        />
      </Block>
    </div>
  );
}
