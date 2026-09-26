import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarPlus } from "lucide-react";
import { t } from "@/i18n/en";
import { getPrayerSettings } from "@/lib/settings";
import {
  compassPoint,
  formatClock,
  getPrayerMonth,
  lagosDayKey,
  parseMonthKey,
  zonedParts,
  CALCULATION_METHOD_LABELS,
  PRAYER_NAMES,
  type PrayerDay,
} from "@/lib/prayer";
import { cn } from "@/lib/utils";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";
import { StarPattern } from "@/components/ui/star-pattern";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: t.prayer.monthTitle,
  description: `${t.prayer.monthLede} ${t.prayer.calculated}`,
  alternates: { canonical: "/prayer-times" },
  openGraph: { title: `${t.prayer.monthTitle} · ${t.site.name}`, url: "/prayer-times" },
};

const monthKey = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}`;
const shiftMonth = (year: number, month: number, by: number) => {
  const d = new Date(Date.UTC(year, month - 1 + by, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
};
const monthLabel = (year: number, month: number) =>
  new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 15)),
  );
const weekdayShort = (d: PrayerDay) =>
  new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" }).format(
    new Date(`${d.date}T12:00:00Z`),
  );

function hijriSpan(days: PrayerDay[]) {
  const first = days[0].hijri;
  const last = days[days.length - 1].hijri;
  if (first.month === last.month) return `${first.monthName} ${first.year} AH`;
  return first.year === last.year
    ? `${first.monthName} – ${last.monthName} ${last.year} AH`
    : `${first.monthName} ${first.year} – ${last.monthName} ${last.year} AH`;
}

export default async function PrayerTimesPage({ searchParams }: PageProps<"/prayer-times">) {
  const { m } = await searchParams;
  const now = new Date();
  const todayKey = lagosDayKey(now);
  const current = zonedParts(now);
  const requested = typeof m === "string" ? parseMonthKey(m) : null;
  const { year, month } = requested ?? { year: current.year, month: current.month };

  const settings = await getPrayerSettings();
  const days = getPrayerMonth(year, month, settings);
  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const isCurrent = year === current.year && month === current.month;
  const key = monthKey(year, month);
  const cols = days[0].prayers;
  const qibla = days[0].qiblaDegrees;
  const method = days[0].method;

  return (
    <>
      <section aria-labelledby="timetable-title" className="relative isolate overflow-hidden pt-[calc(var(--header-h)+4rem)] pb-12 print:pt-0 print:pb-4">
        <StarPattern className="absolute inset-0 -z-10 text-clay print:hidden" opacity={0.1} size={150} />
        <Container size="wide">
          <Eyebrow className="print:hidden">{t.prayer.title}</Eyebrow>
          <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-8">
              <Heading as="h1" id="timetable-title" size="xl" className="print:text-[28pt]">
                {monthLabel(year, month)}
              </Heading>
              <p className="mt-4 text-lede text-muted">{hijriSpan(days)}</p>
            </div>
            <p className="max-w-[40ch] text-muted lg:col-span-4 lg:justify-self-end print:hidden">{t.prayer.monthLede}</p>
          </div>

          <nav
            aria-label={t.prayer.monthTitle}
            className="mt-12 flex flex-wrap items-center justify-between gap-4 hairline-t pt-6 print:hidden"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/prayer-times?m=${monthKey(prev.year, prev.month)}`}
                className="inline-flex h-11 items-center gap-2 rounded-full pl-3 pr-5 text-[0.875rem] ring-1 ring-inset ring-line-strong transition-colors duration-500 ease-[var(--ease-spring)] hover:bg-ink hover:text-limestone"
              >
                <ArrowLeft size={15} strokeWidth={1.4} aria-hidden />
                <span className="sr-only">{t.prayer.previousMonth}: </span>
                {monthLabel(prev.year, prev.month)}
              </Link>
              {!isCurrent ? (
                <Link
                  href="/prayer-times"
                  className="inline-flex h-11 items-center rounded-full px-5 text-[0.875rem] text-accent underline decoration-line-strong underline-offset-4 hover:decoration-current"
                >
                  {t.prayer.thisMonth}
                </Link>
              ) : null}
              <Link
                href={`/prayer-times?m=${monthKey(next.year, next.month)}`}
                className="inline-flex h-11 items-center gap-2 rounded-full pl-5 pr-3 text-[0.875rem] ring-1 ring-inset ring-line-strong transition-colors duration-500 ease-[var(--ease-spring)] hover:bg-ink hover:text-limestone"
              >
                <span className="sr-only">{t.prayer.nextMonth}: </span>
                {monthLabel(next.year, next.month)}
                <ArrowRight size={15} strokeWidth={1.4} aria-hidden />
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-5">
              <span className="hidden text-[0.8125rem] text-muted md:inline">{t.prayer.printHint}</span>
              <a
                href={`/api/prayer-times/ics?m=${key}`}
                download={`gwallaga-prayer-times-${key}.ics`}
                className="inline-flex h-11 items-center gap-2.5 rounded-full bg-accent px-5 text-[0.875rem] font-medium text-accent-fg transition-shadow duration-500 hover:shadow-[0_18px_40px_-22px_rgba(31,42,90,0.9)]"
              >
                <CalendarPlus size={16} strokeWidth={1.4} aria-hidden />
                {t.prayer.downloadIcs}
              </a>
            </div>
          </nav>
        </Container>
      </section>

      <section aria-label={t.prayer.monthTitle} className="pb-(--section-y) print:pb-0">
        <Container size="wide">
          <div className="-mx-(--gutter) overflow-x-auto px-(--gutter) print:mx-0 print:overflow-visible print:px-0" tabIndex={0} role="region" aria-labelledby="timetable-title">
            <table className="prayer-month w-full min-w-[56rem] border-collapse whitespace-nowrap text-left tabular-nums print:min-w-0">
              <caption className="sr-only">
                {t.prayer.monthTitle}, {monthLabel(year, month)}. {t.prayer.calculated}
              </caption>
              <thead>
                <tr className="text-eyebrow font-medium uppercase text-muted">
                  <th scope="col" className="sticky left-0 z-[1] bg-ground py-4 pr-4 print:static">
                    {t.prayer.date}
                  </th>
                  <th scope="col" className="py-4 pr-4">
                    {t.prayer.hijri}
                  </th>
                  {cols.map((p) => (
                    <th key={p.key} scope="col" className="py-4 pr-4">
                      <span className="block">{PRAYER_NAMES[p.key].en}</span>
                      <span className="mt-1 block font-normal normal-case tracking-normal">
                        {p.key === "sunrise" ? "" : `${t.prayer.adhan} · ${t.prayer.iqamah}`}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {days.map((d) => {
                  const isToday = d.date === todayKey;
                  return (
                    <tr
                      key={d.date}
                      aria-current={isToday ? "date" : undefined}
                      className={cn(
                        "hairline-t",
                        d.isFriday && "bg-sand/45",
                        isToday && "bg-indigo/[0.06] shadow-[inset_2px_0_0_var(--color-indigo)] print:shadow-none",
                      )}
                    >
                      <th scope="row" className={cn("sticky left-0 z-[1] py-3.5 pr-4 font-normal print:static", isToday ? "bg-[color-mix(in_oklab,var(--color-indigo)_6%,var(--ground))]" : d.isFriday ? "bg-[color-mix(in_oklab,var(--color-sand)_45%,var(--ground))]" : "bg-ground")}>
                        <span className="inline-flex items-baseline gap-2">
                          <span className="w-6 text-[1.0625rem] font-medium text-fg">{Number(d.date.slice(8))}</span>
                          <span className={cn("text-[0.8125rem]", d.isFriday ? "font-medium text-fg" : "text-muted")}>
                            {weekdayShort(d)}
                          </span>
                          {isToday ? (
                            <span className="text-eyebrow font-medium uppercase text-indigo">{t.prayer.todayRow}</span>
                          ) : null}
                        </span>
                      </th>
                      <td className="py-3.5 pr-4 text-[0.8125rem] text-muted">
                        {d.hijri.day} {d.hijri.monthName}
                      </td>
                      {d.prayers.map((p) => (
                        <td key={p.key} className="py-3.5 pr-4">
                          <time dateTime={p.adhan.toISOString()} className={cn("text-[1rem]", p.key === "sunrise" ? "text-muted" : "text-fg")}>
                            {formatClock(p.adhan)}
                          </time>
                          {p.iqamah ? (
                            <>
                              <span className="text-muted"> · </span>
                              <time dateTime={p.iqamah.toISOString()} className="text-[0.875rem] text-muted">
                                {formatClock(p.iqamah)}
                              </time>
                              {d.isFriday && p.key === "dhuhr" ? (
                                <span className="ml-1.5 text-eyebrow font-medium uppercase text-clay">{t.prayer.jumuah}</span>
                              ) : null}
                            </>
                          ) : null}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-12 grid gap-8 hairline-t pt-8 text-[0.875rem] text-muted md:grid-cols-3 print:mt-4 print:pt-2 print:text-[8pt]">
            <p>
              <span className="block text-eyebrow font-medium uppercase text-fg">{t.prayer.jumuah}</span>
              <span className="mt-2 block">
                {t.prayer.jumuahNote} {t.prayer.jumuahFirst} {settings.jumuahFirst}
                {settings.jumuahSecond ? ` · ${t.prayer.jumuahSecond} ${settings.jumuahSecond}` : ""}.
              </span>
            </p>
            <p>
              <span className="block text-eyebrow font-medium uppercase text-fg">{t.prayer.method}</span>
              <span className="mt-2 block">
                {CALCULATION_METHOD_LABELS[method]}. {t.prayer.shafi}. {t.prayer.calculated}
              </span>
            </p>
            <p>
              <span className="block text-eyebrow font-medium uppercase text-fg">{t.prayer.qibla}</span>
              <span className="mt-2 block tabular-nums">
                {Math.round(qibla)}° {compassPoint(qibla)} · {t.prayer.qiblaHint}
              </span>
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}
