import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { t } from "@/i18n/en";
import { getSiteSettings } from "@/lib/settings";
import { getPrayerSnapshot } from "@/lib/prayer/server";
import { cn, formatNaira } from "@/lib/utils";
import { ArabicLine } from "@/components/ui/arabic-line";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";
import { Section } from "@/components/ui/section";
import { StarPattern } from "@/components/ui/star-pattern";
import { PrayerStrip } from "@/components/prayer/prayer-strip";
import { StatusLine } from "@/components/prayer/status-line";
import { Choreography } from "@/components/home/choreography";
import { ImageBand } from "@/components/home/image-band";

export const revalidate = 300;

export const metadata: Metadata = {
  title: { absolute: `${t.site.name} · ${t.home.metaTitle}` },
  description: t.home.metaDescription,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    title: `${t.site.name} · ${t.home.metaTitle}`,
    description: t.home.metaDescription,
  },
  twitter: { card: "summary_large_image", title: t.site.name, description: t.home.metaDescription },
};

async function getAnnouncements() {
  try {
    return await prisma.announcement.findMany({
      where: { publishedAt: { not: null, lte: new Date() } },
      orderBy: { publishedAt: "desc" },
      take: 3,
      select: { id: true, title: true, body: true, publishedAt: true },
    });
  } catch (error) {
    console.error("[home] announcements unavailable", error);
    return [];
  }
}

const noticeDate = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Lagos",
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function HomePage() {
  const [site, { serverNow, config, today }, announcements] = await Promise.all([
    getSiteSettings(),
    getPrayerSnapshot(),
    getAnnouncements(),
  ]);

  const h = t.home;
  const live = [
    { href: "/nikah", ...h.services.nikah, meta: `${h.fee} ${formatNaira(site.nikahFeeKobo)}` },
    { href: "/donate", ...h.services.give },
    { href: "/prayer-times", ...h.services.prayer },
  ];
  const soon = [h.services.naming, h.services.hall, h.services.imam, h.services.janazah, h.services.islamiyya];

  return (
    <Choreography>
      {/* ── Hero (sticky: the prayer strip rises over it) ─────────────────── */}
      <div className="relative">
        <section
          data-hero
          aria-labelledby="hero-title"
          className="sticky top-0 isolate flex min-h-[100svh] flex-col overflow-hidden"
        >
          {/* Future photograph / video of the house */}
          <div data-placeholder="hero-media" className="placeholder-drift absolute inset-0 -z-30" />
          <div aria-hidden className="absolute inset-0 -z-20 flex items-center justify-center">
            <div data-hero-star className="aspect-square w-[190vmax] shrink-0">
              <StarPattern className="size-full text-clay" opacity={0.16} size={168} strokeWidth={0.7} />
            </div>
          </div>
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(90%_70%_at_18%_78%,var(--color-limestone)_0%,color-mix(in_oklab,var(--color-limestone)_55%,transparent)_45%,transparent_80%)]"
          />

          <div data-hero-content className="flex flex-1 origin-[50%_30%] flex-col pt-[calc(var(--header-h)+2.5rem)] pb-8 sm:pb-10">
            <Container size="wide">
              <ArabicLine data-hero-reveal className="text-[1.3rem] text-ink-soft sm:text-[1.5rem]">
                {h.bismillah}
              </ArabicLine>
            </Container>

            <Container size="wide" className="mt-auto pt-16">
              <Heading
                as="h1"
                id="hero-title"
                size="hero"
                data-hero-split
                data-hero-reveal
                className="max-w-[15ch] text-[clamp(2.6rem,11vw,4.5rem)] md:text-display-hero"
              >
                <span className="block">{h.heroLine1}</span>
                <span className="block">{h.heroLine2}</span>
                <span className="block">
                  {h.heroLine3Pre} <em>{h.heroLine3Em}</em>
                </span>
              </Heading>

              <div className="mt-12 grid gap-8 hairline-t pt-8 md:mt-16 lg:grid-cols-12 lg:items-end">
                <div data-hero-reveal className="flex flex-col gap-4 lg:col-span-4">
                  <StatusLine day={today} config={config} serverNow={serverNow} className="text-[0.9375rem] font-medium" />
                  <a
                    href="#today"
                    className="group hidden items-center gap-2 text-[0.8125rem] text-muted transition-colors duration-500 hover:text-fg lg:inline-flex"
                  >
                    <ArrowDown size={14} strokeWidth={1.4} aria-hidden className="transition-transform duration-500 ease-[var(--ease-spring)] group-hover:translate-y-0.5" />
                    {h.scroll}
                  </a>
                </div>
                <p data-hero-reveal className="text-lede text-ink-soft lg:col-span-4 lg:col-start-6">
                  {h.heroLede}
                </p>
                <div data-hero-reveal className="flex flex-wrap gap-3 lg:col-span-3 lg:col-start-10 lg:justify-end">
                  <Button asChild size="lg" icon magnetic>
                    <Link href="/nikah">{h.ctaNikah}</Link>
                  </Button>
                  <Button asChild size="lg" variant="secondary">
                    <Link href="/donate">{h.ctaGive}</Link>
                  </Button>
                </div>
              </div>
            </Container>
          </div>
        </section>

        {/* ── Prayer strip: the product ──────────────────────────────────── */}
        <PrayerStrip id="today" day={today} config={config} serverNow={serverNow} />
      </div>

      {/* ── 01 The House ─────────────────────────────────────────────────── */}
      <Section id="the-house" aria-labelledby="house-title" className="relative z-10 bg-ground">
        <Container size="wide">
          <div className="grid gap-8 lg:grid-cols-12">
            <Eyebrow index="01" className="lg:col-span-12">
              {h.houseEyebrow}
            </Eyebrow>
            <Heading id="house-title" size="lg" data-reveal className="max-w-[22ch] lg:col-span-9">
              {h.houseTitle}
            </Heading>
          </div>

          {/* PLACEHOLDER COPY: the three blocks below are written to be true without
              unverified facts (no founding year, capacity or cost). Replace the
              "[—]" year and refine with the masjid committee. */}
          <div className="mt-20 grid gap-x-8 gap-y-16 md:mt-28 lg:grid-cols-12 lg:gap-y-28">
            <ImageBand name="house-exterior" className="aspect-[5/4] lg:col-span-7" parallax={9} />
            <HouseBlock index="i" {...h.houseBlocks[0]} className="lg:col-span-4 lg:col-start-9 lg:self-end" />

            <HouseBlock index="ii" {...h.houseBlocks[1]} className="lg:col-span-4 lg:self-start lg:pt-24" />
            <ImageBand name="house-prayer-hall" className="aspect-[16/11] lg:col-span-7 lg:col-start-6" parallax={12} tone="indigo" />

            <div data-reveal className="grid gap-8 hairline-t pt-12 lg:col-span-12 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <p className="text-eyebrow font-medium uppercase text-muted tabular-nums">iii</p>
                <h3 className="mt-5 font-display text-display-md">{h.houseBlocks[2].title}</h3>
              </div>
              <p className="text-lede text-ink-soft lg:col-span-6 lg:col-start-7">{h.houseBlocks[2].body}</p>
            </div>
          </div>
        </Container>
      </Section>

      {/* ── 02 The Minbar (colour shift) ─────────────────────────────────── */}
      <Section tone="indigo" data-tone-section aria-labelledby="minbar-title" className="overflow-hidden">
        <StarPattern className="absolute inset-0 -z-20 text-limestone" opacity={0.07} size={220} />
        <div data-tone-veil aria-hidden className="absolute inset-0 -z-10 bg-limestone opacity-0" />
        <Container size="wide" data-tone-content>
          <div className="flex flex-wrap items-center gap-4">
            <Eyebrow index="02">{h.minbarEyebrow}</Eyebrow>
            <span className="rounded-full px-3 py-1 text-eyebrow font-medium uppercase ring-1 ring-inset ring-line-strong">
              {h.minbarPill}
            </span>
          </div>
          <Heading id="minbar-title" size="xl" className="mt-10 max-w-[16ch]">
            {h.minbarTitlePre} <em>{h.minbarTitleEm}</em> {h.minbarTitlePost}
          </Heading>
          <div className="mt-16 grid gap-10 lg:grid-cols-12">
            <ArabicLine className="text-[1.6rem] text-(--fg-muted) lg:col-span-4 lg:text-left">{h.minbarAyah}</ArabicLine>
            <p className="text-lede text-(--fg-muted) lg:col-span-6 lg:col-start-7">{h.minbarBody}</p>
          </div>
        </Container>
      </Section>

      {/* ── 03 Services ──────────────────────────────────────────────────── */}
      <Section aria-labelledby="services-title" className="bg-ground">
        <Container size="wide">
          <div className="grid gap-8 lg:grid-cols-12">
            <Eyebrow index="03" className="lg:col-span-12">
              {h.servicesEyebrow}
            </Eyebrow>
            <Heading id="services-title" size="lg" data-reveal className="max-w-[20ch] lg:col-span-9">
              {h.servicesTitle}
            </Heading>
          </div>

          <div className="mt-20 hairline-y">
            <ul className="grid gap-px bg-line md:grid-cols-3">
              {live.map((s) => (
                <li key={s.href} className="bg-ground">
                  <Link
                    href={s.href}
                    className="group flex h-full min-h-[18rem] flex-col justify-between gap-10 p-7 transition-colors duration-700 ease-[var(--ease-spring)] hover:bg-surface sm:p-9"
                  >
                    <span className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 text-eyebrow font-medium uppercase text-indigo">
                        <span aria-hidden className="size-1.5 rounded-full bg-indigo" />
                        {h.live}
                      </span>
                      <span
                        aria-hidden
                        className="flex size-10 items-center justify-center rounded-full ring-1 ring-inset ring-line-strong transition-[transform,background-color,color] duration-500 ease-[var(--ease-spring)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:bg-indigo group-hover:text-limestone"
                      >
                        <ArrowUpRight size={16} strokeWidth={1.3} />
                      </span>
                    </span>
                    <span>
                      <span className="block font-display text-display-sm">{s.title}</span>
                      <span className="mt-3 block max-w-[32ch] text-muted">{s.body}</span>
                      <span className="mt-5 block text-[0.9375rem] font-medium tabular-nums">{s.meta}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <ul className="grid grid-cols-2 gap-px border-t border-line bg-line lg:grid-cols-5">
              {soon.map((s, i) => (
                <li
                  key={s.title}
                  className={cn("bg-ground px-5 py-6 sm:p-8", i === soon.length - 1 && "col-span-2 lg:col-span-1")}
                >
                  <span className="text-eyebrow font-medium uppercase text-muted">{h.soon}</span>
                  <span className="mt-5 block font-display text-[1.2rem] leading-tight text-muted sm:mt-6 sm:text-[1.375rem]">{s.title}</span>
                  <span className="mt-2 block text-[0.875rem] text-muted">{s.body}</span>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </Section>

      {/* ── Give ─────────────────────────────────────────────────────────── */}
      <Section tone="sand" aria-labelledby="give-title" className="overflow-hidden">
        <StarPattern className="absolute inset-y-0 right-0 -z-10 w-1/2 text-clay" opacity={0.14} size={120} />
        <Container size="wide">
          <div className="grid gap-14 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <Eyebrow index="04">{h.giveEyebrow}</Eyebrow>
              <Heading id="give-title" size="xl" data-reveal className="mt-8 max-w-[14ch]">
                {h.giveTitlePre} <em>{h.giveTitleEm}</em> {h.giveTitlePost}
              </Heading>
            </div>
            <div className="lg:col-span-4 lg:col-start-9">
              <p className="text-lede text-muted">{h.giveBody}</p>
              <ul className="mt-8 flex flex-wrap gap-2">
                {h.givePurposes.map((p) => (
                  <li key={p.slug}>
                    <Link
                      href={`/donate?purpose=${p.slug}`}
                      className="inline-flex h-10 items-center rounded-full px-4 text-[0.875rem] ring-1 ring-inset ring-line-strong transition-colors duration-500 ease-[var(--ease-spring)] hover:bg-ink hover:text-limestone"
                    >
                      {p.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <Button asChild size="lg" icon magnetic className="mt-10">
                <Link href="/donate">{t.buttons.donate}</Link>
              </Button>
            </div>
          </div>
        </Container>
      </Section>

      {/* ── Notices (only when published) ────────────────────────────────── */}
      {announcements.length > 0 ? (
        <Section spacing="tight" aria-labelledby="notices-title" className="bg-ground">
          <Container size="wide" className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <Eyebrow>{h.announcementsEyebrow}</Eyebrow>
              <Heading id="notices-title" size="md" className="mt-6">
                {h.announcementsTitle}
              </Heading>
            </div>
            <ul className="lg:col-span-8">
              {announcements.map((a) => (
                <li key={a.id} className="grid gap-3 hairline-t py-7 sm:grid-cols-[9rem_1fr] sm:gap-8">
                  <time dateTime={a.publishedAt!.toISOString()} className="text-[0.875rem] text-muted tabular-nums">
                    {noticeDate.format(a.publishedAt!)}
                  </time>
                  <div>
                    <h3 className="font-display text-display-sm">{a.title}</h3>
                    <p className="mt-2 whitespace-pre-line text-muted">{a.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      ) : null}
    </Choreography>
  );
}

function HouseBlock({
  index,
  title,
  body,
  className,
}: {
  index: string;
  title: string;
  body: string;
  className?: string;
}) {
  return (
    <div data-reveal className={className}>
      <p className="text-eyebrow font-medium uppercase text-muted tabular-nums">{index}</p>
      <h3 className="mt-5 font-display text-display-sm">{title}</h3>
      <p className="mt-5 max-w-[36ch] leading-relaxed text-muted">{body}</p>
    </div>
  );
}
