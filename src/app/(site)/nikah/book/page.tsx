import type { Metadata } from "next";
import { t } from "@/i18n/en";
import { getSiteSettings } from "@/lib/settings";
import { activeWeekdays } from "@/lib/nikah/slots";
import { bookingWindow } from "@/lib/nikah/time";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";
import { Section } from "@/components/ui/section";
import { BookingForm } from "./booking-form";

// The window moves daily and slots change in admin: render per request.
export const dynamic = "force-dynamic";

const f = t.nikah.form;

export const metadata: Metadata = {
  title: t.nikah.meta.bookTitle,
  description: t.nikah.meta.description,
  alternates: { canonical: "/nikah/book" },
};

export default async function NikahBookPage() {
  const [site, weekdays] = await Promise.all([getSiteSettings(), activeWeekdays()]);
  return (
    <Section spacing="none" className="pb-(--section-y) pt-[calc(var(--header-h)+clamp(2.5rem,6vw,5rem))]" aria-labelledby="book-title">
      <Container>
        <div className="max-w-[46rem]">
          <Eyebrow>{f.eyebrow}</Eyebrow>
          <Heading as="h1" id="book-title" size="lg" className="mt-6">
            {f.title}
          </Heading>
          <p className="mt-6 text-lede text-muted">{f.lede}</p>
        </div>
        <div className="mt-16">
          <BookingForm feeKobo={site.nikahFeeKobo} weekdays={weekdays} window={bookingWindow()} />
        </div>
      </Container>
    </Section>
  );
}
