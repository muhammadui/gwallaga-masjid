import Link from "next/link";
import { t } from "@/i18n/en";
import { getBankAccount, getPrayerSettings, getSiteSettings } from "@/lib/settings";
import { Container } from "@/components/ui/container";
import { Divider } from "@/components/ui/divider";
import { StarPattern } from "@/components/ui/star-pattern";
import { ArabicLine } from "@/components/ui/arabic-line";
import { NAV_LINKS } from "./nav-links";

/** Hijri year (Umm al-Qura) for `date` shifted by the admin offset. */
function hijriYear(date: Date, offsetDays: number): string {
  const shifted = new Date(date.getTime() + offsetDays * 86_400_000);
  const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", {
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).formatToParts(shifted);
  return parts.find((p) => p.type === "year")?.value ?? "";
}

function waLink(num: string) {
  const digits = num.replace(/\D/g, "").replace(/^0/, "234");
  return `https://wa.me/${digits}`;
}

export async function Footer() {
  const [site, prayer, bank] = await Promise.all([getSiteSettings(), getPrayerSettings(), getBankAccount()]);
  const now = new Date();
  const year = new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Africa/Lagos" }).format(now);

  return (
    <footer className="tone-indigo relative isolate overflow-hidden">
      <StarPattern className="absolute inset-0 -z-10 text-limestone" opacity={0.07} size={180} />
      <Container size="wide" className="pt-[calc(var(--section-y)*0.7)] pb-10">
        <div className="grid gap-16 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <p className="font-display text-display-md">{site.masjidName}</p>
            <ArabicLine className="mt-4 text-[1.35rem] text-(--fg-muted)">{t.site.nameArabic}</ArabicLine>
            <address className="mt-10 max-w-xs not-italic leading-relaxed text-(--fg-muted)">
              <span className="mb-2 block text-eyebrow uppercase text-(--fg)">{t.footer.visit}</span>
              {site.address}
            </address>
          </div>

          <div className="grid gap-12 sm:grid-cols-2 lg:col-span-7 lg:grid-cols-3">
            <nav aria-label={t.a11y.footerNav}>
              <p className="mb-5 text-eyebrow uppercase">{t.footer.quickLinks}</p>
              <ul className="space-y-3 text-[0.9375rem] text-(--fg-muted)">
                {NAV_LINKS.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="transition-colors duration-500 ease-[var(--ease-spring)] hover:text-(--fg)">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div>
              <p className="mb-5 text-eyebrow uppercase">{t.footer.contact}</p>
              <dl className="space-y-3 text-[0.9375rem]">
                {site.phone ? (
                  <div>
                    <dt className="sr-only">{t.footer.phone}</dt>
                    <dd>
                      <a href={`tel:${site.phone.replace(/\s/g, "")}`} className="text-(--fg-muted) hover:text-(--fg)">
                        {site.phone}
                      </a>
                    </dd>
                  </div>
                ) : null}
                {site.whatsapp ? (
                  <div>
                    <dt className="sr-only">{t.footer.whatsapp}</dt>
                    <dd>
                      <a href={waLink(site.whatsapp)} className="text-(--fg-muted) hover:text-(--fg)" rel="noopener">
                        {t.footer.whatsapp} · {site.whatsapp}
                      </a>
                    </dd>
                  </div>
                ) : null}
                {!site.phone && !site.whatsapp ? <dd className="text-(--fg-muted)">{site.address}</dd> : null}
              </dl>
            </div>

            {bank ? (
              <div className="sm:col-span-2 lg:col-span-1">
                <p className="mb-5 text-eyebrow uppercase">{t.footer.giveByTransfer}</p>
                <dl className="space-y-2 text-[0.9375rem]">
                  <div className="flex justify-between gap-4 hairline-b pb-2">
                    <dt className="text-(--fg-muted)">{t.footer.bank}</dt>
                    <dd>{bank.bankName}</dd>
                  </div>
                  <div className="flex justify-between gap-4 hairline-b pb-2">
                    <dt className="text-(--fg-muted)">{t.footer.accountName}</dt>
                    <dd className="text-right">{bank.accountName}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-(--fg-muted)">{t.footer.accountNumber}</dt>
                    <dd className="font-medium tabular-nums tracking-wider">{bank.accountNumber}</dd>
                  </div>
                </dl>
              </div>
            ) : null}
          </div>
        </div>

        <Divider className="mt-24 mb-8 opacity-60" />

        <div className="flex flex-col gap-3 text-[0.8125rem] text-(--fg-muted) sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} · {hijriYear(now, prayer.hijriOffsetDays)} AH · {site.masjidName}. {t.footer.rights}
          </p>
          <p className="flex items-center gap-6">
            <span>{t.footer.builtWithLove}</span>
            <Link href="/admin" className="hover:text-(--fg)">
              {t.footer.admin}
            </Link>
          </p>
        </div>
      </Container>
    </footer>
  );
}
