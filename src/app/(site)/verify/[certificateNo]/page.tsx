import type { Metadata } from "next";
import { t } from "@/i18n/en";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";
import { normalizeCertificateNo } from "@/lib/nikah/format";
import { formatLagosDate } from "@/lib/nikah/time";
import { Container } from "@/components/ui/container";
import { Divider } from "@/components/ui/divider";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";
import { Section } from "@/components/ui/section";

export const dynamic = "force-dynamic";

const v = t.nikah.verify;

export const metadata: Metadata = { title: t.nikah.meta.verifyTitle, robots: { index: false, follow: false } };

/**
 * Public certificate check: VALID / REVOKED / NOT FOUND with the couple,
 * date, imam and issue date. Nothing else is disclosed. Accepts the canonical
 * number URL-encoded (GJM%2FNK%2F2026%2F0001) or the dashed slug from the QR.
 */
export default async function VerifyPage({ params }: PageProps<"/verify/[certificateNo]">) {
  const { certificateNo: raw } = await params;
  const no = normalizeCertificateNo(raw);
  const cert = no
    ? await prisma.certificate.findUnique({
        where: { certificateNo: no },
        select: {
          certificateNo: true,
          issuedAt: true,
          revokedAt: true,
          booking: { select: { groomName: true, brideName: true, solemnizedAt: true, scheduledAt: true, officiantName: true } },
        },
      })
    : null;

  const state = !cert ? "notFound" : cert.revokedAt ? "revoked" : "valid";
  const title = state === "valid" ? v.valid : state === "revoked" ? v.revoked : v.notFound;
  const body = state === "valid" ? v.validBody : state === "revoked" ? v.revokedBody : v.notFoundBody;

  return (
    <Section spacing="none" className="pb-(--section-y) pt-[calc(var(--header-h)+clamp(3rem,8vw,7rem))]" aria-labelledby="verify-title">
      <Container size="narrow">
        <Eyebrow>{v.eyebrow}</Eyebrow>
        <div className="mt-8 flex items-center gap-4">
          <span
            aria-hidden
            className={cn(
              "inline-flex size-11 shrink-0 items-center justify-center rounded-full text-[1.25rem]",
              state === "valid" ? "bg-accent text-accent-fg" : state === "revoked" ? "bg-danger/10 text-danger" : "bg-ink/[0.06] text-muted",
            )}
          >
            {state === "valid" ? "✓" : state === "revoked" ? "✕" : "?"}
          </span>
          <Heading as="h1" id="verify-title" size="md" className={cn(state === "revoked" && "text-danger")}>
            {title}
          </Heading>
        </div>
        <p className="mt-6 text-lede text-muted">{body}</p>

        {cert ? (
          <>
            <Divider ornament className="my-12" />
            <dl>
              {[
                [v.number, <span key="n" className="font-mono">{cert.certificateNo}</span>],
                [v.couple, `${cert.booking.groomName} & ${cert.booking.brideName}`],
                [v.date, formatLagosDate(cert.booking.solemnizedAt ?? cert.booking.scheduledAt)],
                [v.officiant, cert.booking.officiantName ?? ""],
                [v.issued, formatLagosDate(cert.issuedAt)],
                ...(cert.revokedAt ? [[v.revokedOn, formatLagosDate(cert.revokedAt)] as const] : []),
              ].map(([k, val]) => (
                <div key={String(k)} className="grid gap-1 hairline-b py-4 sm:grid-cols-[12rem_1fr]">
                  <dt className="text-[0.8125rem] text-muted">{k}</dt>
                  <dd className="text-[1rem]">{val}</dd>
                </div>
              ))}
            </dl>
          </>
        ) : raw ? (
          <p className="mt-10 font-mono text-[0.9375rem] text-muted">{no ?? decodeSafe(raw)}</p>
        ) : null}
      </Container>
    </Section>
  );
}

function decodeSafe(s: string) {
  try {
    return decodeURIComponent(s).slice(0, 40);
  } catch {
    return s.slice(0, 40);
  }
}
