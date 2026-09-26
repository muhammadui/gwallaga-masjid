import Link from "next/link";
import { t } from "@/i18n/en";
import { ArabicLine } from "@/components/ui/arabic-line";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Divider } from "@/components/ui/divider";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";
import { Section } from "@/components/ui/section";
import { StarPattern } from "@/components/ui/star-pattern";

/**
 * Placeholder home: demonstrates the design system (Section tones, Heading
 * scale, Eyebrow, ArabicLine, Button variants, StarPattern). Replaced by the
 * real cinematic home page.
 */
export default function HomePage() {
  return (
    <>
      <Section className="flex min-h-[100dvh] items-end overflow-hidden pt-40" aria-labelledby="hero-title">
        <div data-placeholder="hero-band" className="placeholder-drift absolute inset-0 -z-20" />
        <StarPattern className="absolute inset-0 -z-10 text-clay" opacity={0.16} size={140} />
        <Container size="wide">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-9">
              <ArabicLine className="mb-10 text-[1.6rem] text-ink-soft">بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</ArabicLine>
              <Eyebrow index="01">{t.site.city} · Murtala Muhammad Way</Eyebrow>
              <Heading as="h1" id="hero-title" size="hero" className="mt-8 max-w-[14ch]">
                A house of prayer, <em>open</em> to all.
              </Heading>
            </div>
            <div className="flex flex-col justify-end gap-8 lg:col-span-3">
              <p className="text-lede text-muted">
                Five prayers a day, Jumu&apos;ah every Friday, and the quiet work of a community gathered around it.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild icon magnetic>
                  <Link href="/donate">{t.buttons.donate}</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/prayer-times">{t.buttons.viewTimes}</Link>
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      <Section id="the-house" aria-labelledby="house-title">
        <Container>
          <div className="grid gap-16 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <Eyebrow index="02">{t.nav.theHouse}</Eyebrow>
              <Heading id="house-title" size="lg" className="mt-8">
                Built by the neighbourhood, kept by it.
              </Heading>
            </div>
            <div className="lg:col-span-6 lg:col-start-7">
              <p className="text-lede text-muted">
                This page is a placeholder that shows the shell and type system. The cinematic home page replaces it.
              </p>
              <Divider ornament className="my-12" />
              <div className="flex flex-wrap gap-3">
                <Button variant="primary" icon>
                  Primary
                </Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      <Section tone="indigo" aria-labelledby="minbar-title" className="overflow-hidden">
        <StarPattern className="absolute inset-0 -z-10 text-limestone" opacity={0.08} size={200} />
        <Container size="narrow" className="text-center">
          <Eyebrow index="03" className="justify-center">
            The Minbar
          </Eyebrow>
          <Heading id="minbar-title" size="xl" className="mt-8">
            Tafsir, <em>season</em> by season.
          </Heading>
          <ArabicLine className="mt-10 text-[1.5rem] text-(--fg-muted)">ٱقْرَأْ بِٱسْمِ رَبِّكَ ٱلَّذِى خَلَقَ</ArabicLine>
        </Container>
      </Section>

      <Section tone="sand" spacing="tight" aria-labelledby="give-title">
        <Container className="flex flex-col items-start justify-between gap-10 md:flex-row md:items-end">
          <div>
            <Eyebrow index="04">{t.nav.donate}</Eyebrow>
            <Heading id="give-title" size="md" className="mt-6 max-w-[18ch]">
              Sadaqah that keeps the lights on.
            </Heading>
          </div>
          <Button asChild size="lg" icon magnetic>
            <Link href="/donate">{t.buttons.donate}</Link>
          </Button>
        </Container>
      </Section>
    </>
  );
}
