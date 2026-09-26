import type { Metadata } from "next";
import { t } from "@/i18n/en";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";
import { Section } from "@/components/ui/section";
import { LookupForm } from "./lookup-form";

const l = t.nikah.lookup;

export const metadata: Metadata = { title: t.nikah.meta.lookupTitle, alternates: { canonical: "/nikah/lookup" } };

export default async function NikahLookupPage({ searchParams }: PageProps<"/nikah/lookup">) {
  const sp = await searchParams;
  const ref = typeof sp.ref === "string" ? sp.ref.slice(0, 20) : undefined;
  return (
    <Section spacing="none" className="pb-(--section-y) pt-[calc(var(--header-h)+clamp(3rem,8vw,7rem))]" aria-labelledby="lookup-title">
      <Container>
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <Eyebrow>{l.eyebrow}</Eyebrow>
            <Heading as="h1" id="lookup-title" size="lg" className="mt-6">
              {l.title}
            </Heading>
            <p className="mt-6 max-w-[38ch] text-lede text-muted">{l.lede}</p>
          </div>
          <div className="lg:col-span-5 lg:col-start-8">
            <div className="rounded-[2rem] bg-ink/[0.04] p-1.5 ring-1 ring-line">
              <div className="rounded-[calc(2rem-0.375rem)] bg-surface px-7 py-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:px-10">
                <LookupForm initialRef={ref} />
              </div>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
