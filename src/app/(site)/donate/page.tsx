import type { Metadata } from "next";
import Link from "next/link";
import { t } from "@/i18n/en";
import { prisma } from "@/lib/db";
import { getBankAccount, getSiteSettings } from "@/lib/settings";
import { getActiveCampaigns } from "@/lib/donations/campaigns";
import { parsePurposeParam } from "@/lib/donations/giving";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import { StarPattern } from "@/components/ui/star-pattern";
import { BankDetails } from "@/components/donate/bank-details";
import { CampaignProgress } from "@/components/donate/progress";
import { DonateForm } from "./donate-form";

const d = t.donate;

export const metadata: Metadata = {
  title: d.meta.title,
  description: d.meta.description,
};

export default async function DonatePage({ searchParams }: PageProps<"/donate">) {
  const sp = await searchParams;
  const slug = (Array.isArray(sp.campaign) ? sp.campaign[0] : sp.campaign)?.trim().toLowerCase();

  const [campaigns, account, site, selected] = await Promise.all([
    getActiveCampaigns(),
    getBankAccount(),
    getSiteSettings(),
    slug
      ? prisma.campaign.findFirst({ where: { slug, active: true }, select: { slug: true, title: true, purpose: true } })
      : Promise.resolve(null),
  ]);

  const initialPurpose =
    parsePurposeParam(sp.purpose) ??
    (selected && selected.purpose !== "CAMPAIGN" ? selected.purpose : null) ??
    "SADAQAH";

  return (
    <>
      {/* ── Hero: the form IS the hero ─────────────────────────────── */}
      <Section spacing="none" className="overflow-clip pb-(--section-y) pt-[calc(var(--header-h)+clamp(2.5rem,6vw,6rem))]" aria-labelledby="give-title">
        <StarPattern className="absolute inset-y-0 right-0 -z-10 hidden w-[55%] text-clay lg:block" opacity={0.09} size={140} />
        <Container>
          <div className="grid gap-14 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-5 lg:pt-6">
              <div className="lg:sticky lg:top-[calc(var(--header-h)+2.5rem)]">
                <Eyebrow>{d.hero.eyebrow}</Eyebrow>
                <Heading as="h1" size="lg" id="give-title" className="mt-7 max-w-[12ch] text-balance">
                  {d.hero.headlineLead} <em>{d.hero.headlineEmphasis}</em>
                </Heading>
                <p className="mt-8 max-w-[34rem] text-lede text-ink-soft">{d.hero.lede}</p>
                <div className="mt-10 flex max-w-[34rem] gap-4 hairline-t pt-6">
                  <span aria-hidden className="mt-2 h-px w-6 shrink-0 bg-(--hairline-gold)" />
                  <p className="text-[0.9375rem] leading-relaxed text-muted">{d.hero.transparency}</p>
                </div>
              </div>
            </div>

            <div id="give" className="scroll-mt-[calc(var(--header-h)+1rem)] lg:col-span-7 xl:col-span-6 xl:col-start-7">
              {/* Double bezel: outer tray + inner limestone-deep plate with a gold hairline */}
              <div className="rounded-[2rem] bg-ink/[0.035] p-1.5 ring-1 ring-line sm:p-2">
                <div className="relative overflow-hidden rounded-[calc(2rem-0.375rem)] bg-limestone-deep px-5 py-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_40px_80px_-48px_rgba(27,24,21,0.35)] sm:rounded-[calc(2rem-0.5rem)] sm:px-9 sm:py-10">
                  <span aria-hidden className="absolute inset-x-8 top-0 h-px bg-(--hairline-gold)" />
                  <h2 className="mb-8 font-display text-display-sm">{d.form.title}</h2>
                  <DonateForm initialPurpose={initialPurpose} campaign={selected ? { slug: selected.slug, title: selected.title } : null} />
                </div>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* ── Campaigns ─────────────────────────────────────────────── */}
      <Section tone="sand" aria-labelledby="campaigns-title">
        <Container>
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <Eyebrow index="01">{d.campaigns.eyebrow}</Eyebrow>
              <Heading id="campaigns-title" size="md" className="mt-6">
                {d.campaigns.title}
              </Heading>
            </div>
            <p className="max-w-[32rem] text-[1rem] leading-relaxed text-muted lg:col-span-5 lg:col-start-8 lg:self-end">{d.campaigns.lede}</p>
          </div>

          {campaigns.length === 0 ? (
            <p className="mt-14 max-w-prose text-muted">{d.campaigns.empty}</p>
          ) : (
            <ul className="mt-16 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {campaigns.map((c) => (
                <li key={c.id} className="rounded-[1.75rem] bg-ink/[0.04] p-1.5 ring-1 ring-line">
                  <article className="flex h-full flex-col rounded-[calc(1.75rem-0.375rem)] bg-limestone px-7 pb-7 pt-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                    <p className="text-eyebrow font-medium uppercase text-muted">{d.purposes[c.purpose]}</p>
                    <h3 className="mt-4 font-display text-[1.75rem] leading-[1.1] tracking-[-0.015em]">{c.title}</h3>
                    <p className="mt-4 flex-1 text-[0.9375rem] leading-relaxed text-ink-soft">{c.description}</p>
                    <div className="mt-8">
                      <CampaignProgress raisedKobo={c.raisedKobo} targetKobo={c.targetKobo} label={c.title} />
                    </div>
                    <Button asChild variant="secondary" size="md" icon className="mt-8 self-start">
                      <Link href={`/donate?campaign=${encodeURIComponent(c.slug)}#give`}>{d.campaigns.giveToThis}</Link>
                    </Button>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </Container>
      </Section>

      {/* ── Where your money goes ─────────────────────────────────── */}
      <Section aria-labelledby="where-title">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <div className="lg:sticky lg:top-[calc(var(--header-h)+2.5rem)]">
                <Eyebrow index="02">{d.whereItGoes.eyebrow}</Eyebrow>
                <Heading id="where-title" size="md" className="mt-6 max-w-[14ch]">
                  {d.whereItGoes.title}
                </Heading>
              </div>
            </div>
            <div className="lg:col-span-7 lg:col-start-6">
              <ol className="hairline-b">
                {d.whereItGoes.items.map((item, i) => (
                  <li key={item.key} className="grid gap-3 hairline-t py-9 sm:grid-cols-[4rem_1fr] sm:gap-6">
                    <span className="font-display text-[1.125rem] tabular-nums text-clay">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <h3 className="font-display text-[1.75rem] leading-tight tracking-[-0.015em]">{item.title}</h3>
                      <p className="mt-3 max-w-[38rem] text-[1rem] leading-relaxed text-ink-soft">{item.body}</p>
                      <Link
                        href={`/donate?purpose=${item.key.toLowerCase()}#give`}
                        className="mt-4 inline-flex text-[0.875rem] font-medium text-indigo underline decoration-(--hairline-gold) underline-offset-4 transition-colors duration-300 hover:decoration-indigo"
                      >
                        {t.buttons.donate} · {d.purposes[item.key]}
                      </Link>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-8 max-w-[38rem] text-[0.875rem] leading-relaxed text-muted">{d.whereItGoes.note}</p>
            </div>
          </div>
        </Container>
      </Section>

      {/* ── Zakat note ────────────────────────────────────────────── */}
      <Section tone="indigo" spacing="tight" aria-labelledby="zakat-title">
        <StarPattern className="absolute inset-0 -z-10 text-limestone" opacity={0.07} size={160} />
        <Container>
          <div className="grid gap-8 py-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <Eyebrow index="03">{d.zakat.eyebrow}</Eyebrow>
              <Heading id="zakat-title" size="md" className="mt-6">
                {d.zakat.title}
              </Heading>
              <p className="mt-6 max-w-[40rem] text-[1.0625rem] leading-relaxed text-muted">{d.zakat.body}</p>
            </div>
            <div className="flex flex-col items-start gap-4 lg:col-span-4 lg:col-start-9 lg:items-end">
              <span className="inline-flex h-9 items-center rounded-full px-4 text-[0.8125rem] text-muted ring-1 ring-inset ring-line-strong">
                {d.zakat.soon}
              </span>
              <Button asChild size="lg" icon>
                <Link href="/donate?purpose=zakat#give">
                  {t.buttons.donate} · {d.purposes.ZAKAT}
                </Link>
              </Button>
            </div>
          </div>
        </Container>
      </Section>

      {/* ── Manual transfer ───────────────────────────────────────── */}
      <Section aria-labelledby="transfer-title">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <Eyebrow index="04">{d.transfer.eyebrow}</Eyebrow>
              <Heading id="transfer-title" size="md" className="mt-6">
                {d.transfer.genericBlockTitle}
              </Heading>
              <p className="mt-6 max-w-[30rem] text-[1rem] leading-relaxed text-muted">{d.transfer.genericBlockLede}</p>
            </div>
            <div className="lg:col-span-6 lg:col-start-7">
              <BankDetails account={account} site={site} />
              <Button asChild variant="secondary" size="md" className="mt-8">
                <Link href="#give">{d.form.bankTransferButton}</Link>
              </Button>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
