import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { t } from "@/i18n/en";
import { prisma } from "@/lib/db";
import { getBankAccount, getSiteSettings } from "@/lib/settings";
import { formatNaira } from "@/lib/utils";
import { purposeLabel } from "@/lib/donations/receipt";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import { BankDetails } from "@/components/donate/bank-details";
import { CopyButton } from "@/components/donate/copy-button";
import { WhatsAppShare } from "@/components/donate/whatsapp-share";

export const dynamic = "force-dynamic";

const tr = t.donate.transfer;

export const metadata: Metadata = { title: tr.title, robots: { index: false, follow: false } };

export default async function TransferPage({ params }: PageProps<"/donate/transfer/[reference]">) {
  const { reference } = await params;
  const ref = decodeURIComponent(reference);
  const donation = await prisma.donation.findUnique({
    where: { reference: ref },
    select: { reference: true, provider: true, status: true, amountKobo: true, purpose: true, campaign: { select: { title: true } } },
  });
  if (!donation || donation.provider !== "BANK_TRANSFER") notFound();
  if (donation.status === "SUCCESS") redirect(`/donate/thank-you/${encodeURIComponent(donation.reference)}`);

  const [account, site] = await Promise.all([getBankAccount(), getSiteSettings()]);
  const amount = formatNaira(donation.amountKobo);
  const purpose = purposeLabel(donation.purpose, donation.campaign?.title);
  const shareText = tr.shareText({
    bank: account?.bankName ?? "—",
    accountName: account?.accountName ?? "—",
    accountNumber: account?.accountNumber ?? "—",
    amount,
    reference: donation.reference,
  });

  return (
    <Section spacing="none" className="pb-(--section-y) pt-[calc(var(--header-h)+clamp(2.5rem,6vw,6rem))]" aria-labelledby="transfer-title">
      <Container>
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Eyebrow>{tr.eyebrow}</Eyebrow>
            <Heading as="h1" id="transfer-title" size="lg" className="mt-7">
              {tr.title}
            </Heading>
            <p className="mt-7 max-w-[32rem] text-lede text-ink-soft">{tr.lede}</p>
            <ol className="mt-10 max-w-[32rem] hairline-b">
              {tr.steps.map((s, i) => (
                <li key={s} className="flex gap-5 hairline-t py-4 text-[0.9375rem] leading-relaxed">
                  <span className="font-display tabular-nums text-clay">{String(i + 1).padStart(2, "0")}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="lg:col-span-6 lg:col-start-7">
            <div className="rounded-[2rem] bg-ink/[0.035] p-1.5 ring-1 ring-line sm:p-2">
              <div className="relative rounded-[calc(2rem-0.375rem)] bg-limestone-deep px-5 py-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] sm:rounded-[calc(2rem-0.5rem)] sm:px-9 sm:py-10">
                <span aria-hidden className="absolute inset-x-8 top-0 h-px bg-(--hairline-gold)" />
                <p className="text-[0.8125rem] text-muted">{tr.amount}</p>
                <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
                  <p className="font-display text-display-md tabular-nums">{amount}</p>
                  <CopyButton value={String(donation.amountKobo / 100)} label={`${tr.copy} ${tr.amount.toLowerCase()}`} />
                </div>
                <p className="mt-2 text-[0.875rem] text-muted">
                  {tr.purpose}: {purpose}
                </p>

                <div className="mt-8 rounded-[1.25rem] bg-surface px-5 py-5 ring-1 ring-inset ring-(--hairline-gold)">
                  <p className="text-[0.8125rem] text-muted">{tr.reference}</p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                    <p className="break-all font-mono text-[1.125rem] tracking-[0.04em] sm:text-[1.25rem]">{donation.reference}</p>
                    <CopyButton value={donation.reference} label={`${tr.copy} ${tr.reference.toLowerCase()}`} />
                  </div>
                </div>

                <BankDetails account={account} site={site} className="mt-8" />

                <div className="mt-8 flex flex-wrap gap-3">
                  <CopyButton value={shareText} label={tr.copyAll} variant="pill">
                    {tr.copyAll}
                  </CopyButton>
                  <WhatsAppShare text={shareText} label={tr.shareWhatsApp} />
                </div>
                <p className="mt-6 text-[0.8125rem] leading-relaxed text-muted">{tr.pendingNote}</p>
              </div>
            </div>
            <Button asChild variant="ghost" size="sm" className="mt-6">
              <Link href="/donate">{tr.backToGive}</Link>
            </Button>
          </div>
        </div>
      </Container>
    </Section>
  );
}
