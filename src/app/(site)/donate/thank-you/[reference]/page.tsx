import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { t } from "@/i18n/en";
import { prisma } from "@/lib/db";
import { absoluteUrl, formatNaira } from "@/lib/utils";
import { firstName } from "@/lib/donations/giving";
import { formatReceiptDate, purposeLabel } from "@/lib/donations/receipt";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import { ArabicLine } from "@/components/ui/arabic-line";
import { Divider } from "@/components/ui/divider";
import { StarPattern } from "@/components/ui/star-pattern";
import { WhatsAppShare } from "@/components/donate/whatsapp-share";
import { DetailRows } from "@/components/donate/bank-details";
import { RefreshWhilePending } from "./refresh-while-pending";
import { ManageSubscription } from "./manage-subscription";

export const dynamic = "force-dynamic";

const ty = t.donate.thankYou;

export const metadata: Metadata = { title: ty.metaTitle, robots: { index: false, follow: false } };

export default async function ThankYouPage({ params }: PageProps<"/donate/thank-you/[reference]">) {
  const { reference } = await params;
  const ref = decodeURIComponent(reference);
  // Select only what the receipt shows: the donor's email never reaches this page.
  const d = await prisma.donation.findUnique({
    where: { reference: ref },
    select: {
      reference: true,
      status: true,
      provider: true,
      purpose: true,
      amountKobo: true,
      feesCoveredKobo: true,
      frequency: true,
      donorName: true,
      anonymous: true,
      paystackSubscriptionCode: true,
      paidAt: true,
      createdAt: true,
      campaign: { select: { title: true } },
    },
  });
  if (!d) notFound();
  if (d.status === "PENDING_TRANSFER") redirect(`/donate/transfer/${encodeURIComponent(d.reference)}`);

  const monthly = d.frequency === "MONTHLY";
  const name = d.anonymous ? "" : firstName(d.donorName);
  const shareText = ty.shareText(absoluteUrl("/donate"));

  if (d.status !== "SUCCESS") {
    const failed = d.status === "FAILED";
    return (
      <Section spacing="none" className="pb-(--section-y) pt-[calc(var(--header-h)+clamp(3rem,8vw,8rem))]">
        {!failed ? <RefreshWhilePending /> : null}
        <Container size="narrow">
          <Eyebrow>{ty.eyebrow}</Eyebrow>
          <Heading as="h1" size="md" className="mt-7">
            {failed ? ty.failedTitle : ty.pendingTitle}
          </Heading>
          <p className="mt-6 text-lede text-ink-soft">{failed ? ty.failedBody : ty.pendingBody}</p>
          <p className="mt-6 font-mono text-[0.875rem] tracking-[0.04em] text-muted">{d.reference}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild icon>
              <Link href="/donate#give">{ty.giveAgain}</Link>
            </Button>
          </div>
        </Container>
      </Section>
    );
  }

  const rows = [
    { label: ty.purpose, value: purposeLabel(d.purpose, d.campaign?.title) },
    { label: ty.date, value: formatReceiptDate(d.paidAt ?? d.createdAt) },
    { label: ty.reference, value: d.reference, copy: true, mono: true },
    { label: ty.method, value: t.donate.methods[d.provider] },
    ...(d.feesCoveredKobo > 0 ? [{ label: ty.feesCovered, value: formatNaira(d.feesCoveredKobo, { decimals: true }) }] : []),
    { label: ty.frequency, value: monthly ? ty.monthly : ty.oneOff },
  ];

  return (
    <Section spacing="none" className="overflow-clip pb-(--section-y) pt-[calc(var(--header-h)+clamp(2.5rem,6vw,6rem))]" aria-labelledby="thanks-title">
      <StarPattern className="absolute inset-x-0 top-0 -z-10 h-[32rem] text-clay [mask-image:linear-gradient(to_bottom,black,transparent)]" opacity={0.1} size={140} />
      <Container>
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Eyebrow>{ty.eyebrow}</Eyebrow>
            <Heading as="h1" id="thanks-title" size="lg" className="mt-7 text-balance">
              {name ? ty.titleNamed(name) : ty.title}
            </Heading>
            <ArabicLine className="mt-10 text-left text-[1.75rem] text-clay">{ty.duaArabic}</ArabicLine>
            <p className="mt-4 max-w-[30rem] font-display text-[1.25rem] italic leading-relaxed text-ink-soft">{ty.dua}</p>
            <div className="mt-10 flex flex-wrap gap-3">
              <WhatsAppShare text={shareText} label={ty.share} />
              <Button asChild icon>
                <Link href="/donate#give">{ty.giveAgain}</Link>
              </Button>
            </div>
          </div>

          <div className="lg:col-span-6 lg:col-start-7">
            <div className="rounded-[2rem] bg-ink/[0.035] p-1.5 ring-1 ring-line sm:p-2">
              <div className="relative rounded-[calc(2rem-0.375rem)] bg-limestone-deep px-5 py-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] sm:rounded-[calc(2rem-0.5rem)] sm:px-9 sm:py-10">
                <span aria-hidden className="absolute inset-x-8 top-0 h-px bg-(--hairline-gold)" />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[0.8125rem] text-muted">{ty.amount}</p>
                  {monthly ? (
                    <span className="inline-flex h-7 items-center rounded-full bg-indigo px-3 text-eyebrow font-medium uppercase text-limestone">
                      {ty.monthly}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 font-display text-display-md tabular-nums">{formatNaira(d.amountKobo)}</p>
                <Divider className="my-8" ornament />
                <DetailRows rows={rows} />
                {monthly && d.paystackSubscriptionCode ? (
                  <div className="mt-6">
                    <ManageSubscription reference={d.reference} />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
