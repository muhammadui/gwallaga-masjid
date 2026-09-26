"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { formatClock, formatLongDate, parseDayKey, type PrayerConfig, type SerializedPrayerDay } from "@/lib/prayer";
import { t } from "@/i18n/en";
import { cn } from "@/lib/utils";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Countdown } from "./countdown";
import { QiblaCompass } from "./qibla-compass";
import { useLivePrayer } from "./use-live-prayer";

export interface PrayerStripProps {
  day: SerializedPrayerDay;
  config: PrayerConfig;
  /** Server render time (epoch ms). */
  serverNow: number;
  id?: string;
}

/**
 * The product: today's adhan / iqamah grid with the next prayer highlighted
 * and a live countdown. Server-rendered HTML (client component for the live
 * parts). Nothing here animates beyond a single opacity fade on mount.
 */
export function PrayerStrip({ day: initial, config, serverNow, id }: PrayerStripProps) {
  const { day, next } = useLivePrayer(initial, config, serverNow, { refetch: true });
  const d = parseDayKey(day.date)!;
  const gregorian = formatLongDate(new Date(Date.UTC(d.year, d.month - 1, d.day, 12)));
  const nextKey = next.prayer.key;
  const nextIsToday = day.prayers.some((p) => p.key === nextKey && p.adhan.getTime() === next.prayer.adhan.getTime());
  const isNext = (key: string) => nextIsToday && key === nextKey;

  return (
    <section
      id={id}
      aria-labelledby="prayer-strip-title"
      className="relative z-10 scroll-mt-20 bg-ground py-[clamp(4rem,8vw,7rem)] shadow-[0_-40px_80px_-40px_rgba(27,24,21,0.25)]"
    >
      <Container size="wide" className="animate-fade-in">
        {/* Date + next prayer */}
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <Eyebrow>{t.home.stripTitle}</Eyebrow>
            <h2 id="prayer-strip-title" className="mt-6 font-display text-display-sm">
              {gregorian}
            </h2>
            <p className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-muted">
              <span>{day.hijri.formatted}</span>
              <span lang="ar" dir="rtl" className="font-arabic text-[1.12em] leading-none">
                {day.hijri.monthNameAr}
              </span>
            </p>
          </div>
          <div className="lg:col-span-5 lg:justify-self-end lg:text-right" aria-live="off">
            <p className="text-eyebrow font-medium uppercase text-muted">
              {t.prayer.nextPrayer} · {next.prayer.nameEn}{" "}
              <span className="text-fg">
                {next.kind === "adhan" ? t.prayer.adhan : t.prayer.iqamah} {formatClock(next.at)}
              </span>
            </p>
            <p className="mt-3 font-display text-[clamp(2.75rem,6vw,5rem)] leading-none tracking-[-0.02em] text-accent">
              <Countdown
                at={next.at.toISOString()}
                serverNow={serverNow}
                label={`${next.prayer.nameEn} ${next.kind === "adhan" ? t.prayer.untilAdhan : t.prayer.untilIqamah}`}
                className="[font-feature-settings:'tnum'_1,'lnum'_1]"
              />
            </p>
            <p className="mt-2 text-[0.8125rem] text-muted">
              {next.kind === "adhan" ? t.prayer.untilAdhan : t.prayer.untilIqamah}
            </p>
          </div>
        </div>

        {/* Desktop / tablet: 6-column table */}
        <div className="mt-14 hidden md:block">
          <table className="w-full table-fixed border-collapse text-left tabular-nums">
            <caption className="sr-only">
              {t.prayer.title} · {gregorian}
            </caption>
            <thead>
              <tr>
                <th scope="col" className="w-[9rem] pb-5 align-bottom">
                  <span className="sr-only">{t.prayer.title}</span>
                </th>
                {day.prayers.map((p) => (
                  <th
                    key={p.key}
                    scope="col"
                    aria-current={isNext(p.key) ? "true" : undefined}
                    className={cn(
                      "relative px-4 pb-5 align-bottom font-normal",
                      isNext(p.key) && "bg-indigo/[0.045] before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-indigo",
                    )}
                  >
                    <span className="block pt-5 font-display text-[1.5rem] leading-none tracking-[-0.01em]">{p.nameEn}</span>
                    <span lang="ar" dir="rtl" className="mt-1.5 block font-arabic text-[1.05rem] leading-none text-muted">
                      {p.nameAr}
                    </span>
                    {isNext(p.key) ? (
                      <span className="absolute right-3 top-3 text-eyebrow font-medium uppercase text-indigo">{t.prayer.next}</span>
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(["adhan", "iqamah"] as const).map((row) => (
                <tr key={row} className="hairline-t">
                  <th scope="row" className="py-5 text-eyebrow font-medium uppercase text-muted">
                    {row === "adhan" ? t.prayer.adhan : t.prayer.iqamah}
                  </th>
                  {day.prayers.map((p) => {
                    const value = row === "adhan" ? p.adhan : p.iqamah;
                    return (
                      <td
                        key={p.key}
                        className={cn(
                          "px-4 py-5 text-[clamp(1.25rem,1.9vw,1.75rem)] leading-none tracking-[-0.01em]",
                          row === "iqamah" && "text-muted",
                          p.key === "sunrise" && "text-muted",
                          isNext(p.key) && "bg-indigo/[0.045] text-fg",
                          isNext(p.key) && row === "iqamah" && "shadow-[inset_0_-1px_0_var(--color-indigo)]",
                        )}
                      >
                        {value ? <time dateTime={value.toISOString()}>{formatClock(value)}</time> : <span aria-label="none">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Phone: one row per prayer */}
        <div className="mt-12 md:hidden">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-6 pb-3 text-eyebrow font-medium uppercase text-muted">
            <span className="sr-only">{t.prayer.title}</span>
            <span aria-hidden />
            <span className="w-14 text-right">{t.prayer.adhan}</span>
            <span className="w-14 text-right">{t.prayer.iqamah}</span>
          </div>
          <ul>
            {day.prayers.map((p) => (
              <li
                key={p.key}
                aria-current={isNext(p.key) ? "true" : undefined}
                className={cn(
                  "relative grid grid-cols-[1fr_auto_auto] items-baseline gap-x-6 py-4 hairline-t tabular-nums",
                  isNext(p.key) && "bg-indigo/[0.045] before:absolute before:inset-y-0 before:-left-(--gutter) before:w-px before:bg-indigo",
                )}
              >
                <span className="flex items-baseline gap-3">
                  <span className="font-display text-[1.3rem] leading-none">{p.nameEn}</span>
                  <span lang="ar" dir="rtl" className="font-arabic text-[0.95rem] leading-none text-muted">
                    {p.nameAr}
                  </span>
                  {isNext(p.key) ? <span className="text-eyebrow font-medium uppercase text-indigo">{t.prayer.next}</span> : null}
                </span>
                <span className="w-14 text-right text-[1.125rem]">
                  <span className="sr-only">{t.prayer.adhan} </span>
                  {formatClock(p.adhan)}
                </span>
                <span className="w-14 text-right text-[1.125rem] text-muted">
                  <span className="sr-only">{t.prayer.iqamah} </span>
                  {p.iqamah ? formatClock(p.iqamah) : "—"}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Jumu'ah, qibla, timetable */}
        <div className="mt-10 grid gap-8 hairline-t pt-8 sm:grid-cols-2 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <p className="text-eyebrow font-medium uppercase text-muted">{t.prayer.jumuah}</p>
            <p className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-[1.0625rem] tabular-nums">
              <span>
                <span className="text-muted">{t.prayer.jumuahFirst}</span> {formatClock(day.jumuah.first)}
              </span>
              {day.jumuah.second ? (
                <span>
                  <span className="text-muted">{t.prayer.jumuahSecond}</span> {formatClock(day.jumuah.second)}
                </span>
              ) : null}
            </p>
          </div>
          <QiblaCompass degrees={day.qiblaDegrees} className="lg:col-span-4" />
          <div className="sm:col-span-2 lg:col-span-3 lg:justify-self-end">
            <Link
              href="/prayer-times"
              className="group inline-flex items-center gap-3 text-[0.9375rem] font-medium text-accent"
            >
              <span className="underline decoration-line-strong underline-offset-[0.3em] transition-colors duration-500 group-hover:decoration-current">
                {t.prayer.fullTimetable}
              </span>
              <span className="flex size-8 items-center justify-center rounded-full bg-indigo/[0.07] transition-transform duration-500 ease-[var(--ease-spring)] group-hover:-translate-y-px group-hover:translate-x-0.5">
                <ArrowUpRight size={15} strokeWidth={1.4} aria-hidden />
              </span>
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
