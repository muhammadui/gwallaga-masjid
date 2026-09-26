import type { Metadata } from "next";
import Link from "next/link";
import { t } from "@/i18n/en";
import { getSiteSettings } from "@/lib/settings";
import { formatNaira } from "@/lib/utils";
import { ArabicLine } from "@/components/ui/arabic-line";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Divider } from "@/components/ui/divider";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";
import { Section } from "@/components/ui/section";
import { StarPattern } from "@/components/ui/star-pattern";

export const revalidate = 300;

const n = t.nikah;

export const metadata: Metadata = {
  title: n.meta.title,
  description: n.meta.description,
  alternates: { canonical: "/nikah" },
};

function Headline() {
  const [before, after] = n.landing.headline.split(n.landing.headlineEm);
  return (
    <>
      {before}
      <em>{n.landing.headlineEm}</em>
      {after}
    </>
  );
}

export default async function NikahLandingPage() {
  const site = await getSiteSettings();
  const l = n.landing;

  return (
    <>
      {/* ── Hero: editorial split ─────────────────────────────────────────── */}
      <Section
        spacing="none"
        aria-labelledby="nikah-title"
        className="overflow-clip pb-(--section-y) pt-[calc(var(--header-h)+clamp(3rem,8vw,8rem))]"
      >
        <StarPattern className="absolute -right-24 top-0 -z-10 h-[46rem] w-[46rem] text-clay max-lg:hidden" opacity={0.1} size={140} />
        <Container>
          <div className="grid gap-14 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-8">
              <Eyebrow>{l.eyebrow}</Eyebrow>
              <Heading as="h1" size="xl" id="nikah-title" className="mt-8 max-w-[14ch] text-balance">
                <Headline />
              </Heading>
            </div>
            <div className="flex flex-col justify-end lg:col-span-4">
              <ArabicLine className="text-[1.75rem] leading-none text-clay">عقد النكاح</ArabicLine>
              <p className="mt-6 text-lede text-muted">{l.lede}</p>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" icon magnetic>
                  <Link href="/nikah/book">{l.ctaBook}</Link>
                </Button>
                <Button asChild size="lg" variant="ghost">
                  <Link href="/nikah/lookup">{l.ctaLookup}</Link>
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* ── How it works: four numbered editorial steps ─────────────────── */}
      <Section tone="sand" aria-labelledby="how-title">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4 lg:sticky lg:top-[calc(var(--header-h)+3rem)] lg:self-start">
              <Eyebrow>{l.howEyebrow}</Eyebrow>
              <Heading id="how-title" size="md" className="mt-6 max-w-[12ch]">
                {l.howTitle}
              </Heading>
            </div>
            <ol className="lg:col-span-8">
              {l.steps.map((step, i) => (
                <li key={step.title} className="grid gap-4 hairline-t py-10 first:pt-0 first:[border-top:0] sm:grid-cols-[6rem_1fr] sm:gap-8">
                  <span aria-hidden className="font-display text-display-md leading-none tabular-nums text-clay">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="font-display text-display-sm">{step.title}</h3>
                    <p className="mt-3 max-w-[52ch] text-[1rem] leading-relaxed text-muted">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </Section>

      {/* ── Fee ─────────────────────────────────────────────────────────── */}
      <Section aria-labelledby="fee-title">
        <Container>
          <div className="grid items-end gap-10 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <Eyebrow>{l.feeEyebrow}</Eyebrow>
              <Heading id="fee-title" size="sm" className="mt-6 max-w-[22ch]">
                {l.feeTitle}
              </Heading>
            </div>
            <div className="lg:col-span-5 lg:col-start-8">
              <div className="rounded-[2rem] bg-ink/[0.04] p-1.5 ring-1 ring-line">
                <div className="rounded-[calc(2rem-0.375rem)] bg-surface px-8 py-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                  <p className="font-display text-display-lg tabular-nums leading-none">{formatNaira(site.nikahFeeKobo)}</p>
                  <Divider className="my-6" />
                  <p className="text-[0.9375rem] leading-relaxed text-muted">{l.feeNote}</p>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* ── What to bring ───────────────────────────────────────────────── */}
      <Section spacing="none" className="pb-(--section-y)" aria-labelledby="bring-title">
        <Container>
          <Eyebrow>{l.bringEyebrow}</Eyebrow>
          <Heading id="bring-title" size="md" className="mt-6">
            {l.bringTitle}
          </Heading>
          <ul className="mt-14 grid gap-x-12 sm:grid-cols-2">
            {l.bring.map((item, i) => (
              <li key={item.title} className="flex gap-6 hairline-t py-8">
                <span aria-hidden className="mt-1 text-eyebrow tabular-nums text-clay">
                  {String.fromCharCode(97 + i)}.
                </span>
                <div>
                  <h3 className="text-[1.0625rem] font-medium">{item.title}</h3>
                  <p className="mt-2 max-w-[46ch] text-[0.9375rem] leading-relaxed text-muted">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <Section tone="sand" aria-labelledby="faq-title">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <Eyebrow>{l.faqEyebrow}</Eyebrow>
              <Heading id="faq-title" size="md" className="mt-6">
                {l.faqTitle}
              </Heading>
            </div>
            <div className="lg:col-span-8">
              {l.faq.map((item) => (
                <details key={item.q} className="group hairline-b py-6 first:hairline-t">
                  <summary className="flex cursor-pointer list-none items-baseline justify-between gap-6 text-[1.0625rem] font-medium [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <span aria-hidden className="text-clay transition-opacity duration-300 group-open:opacity-40">
                      +
                    </span>
                  </summary>
                  <p className="mt-4 max-w-[60ch] text-[0.9375rem] leading-relaxed text-muted">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </Container>
      </Section>

      {/* ── Closing CTA ─────────────────────────────────────────────────── */}
      <Section tone="indigo" aria-labelledby="closing-title" className="overflow-clip">
        <StarPattern className="absolute inset-0 -z-10 h-full w-full text-limestone" opacity={0.07} size={160} />
        <Container size="narrow" className="text-center">
          <Heading id="closing-title" size="lg">
            {l.closingTitle}
          </Heading>
          <p className="mx-auto mt-6 max-w-[40ch] text-lede text-muted">{l.closingBody}</p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" icon magnetic className="bg-limestone text-ink">
              <Link href="/nikah/book">{l.ctaBook}</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/nikah/lookup">{l.ctaLookup}</Link>
            </Button>
          </div>
        </Container>
      </Section>
    </>
  );
}
