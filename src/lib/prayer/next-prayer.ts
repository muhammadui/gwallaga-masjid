import { getPrayerDay, getPrayerDayFor } from "./engine";
import { addDays, parseDayKey } from "./time";
import type { PrayerConfig, PrayerDay, PrayerTime } from "./types";

export interface NextPrayer {
  prayer: PrayerTime;
  at: Date;
  /** "adhan" = the call is next; "iqamah" = the call has gone, the jama'ah is next. */
  kind: "adhan" | "iqamah";
  secondsUntil: number;
}

/**
 * The next adhan or iqamah after `now` within a computed day, or null when the
 * day is exhausted. Sunrise is skipped (it is not a prayer).
 */
export function nextEventInDay(day: PrayerDay, now: Date): NextPrayer | null {
  const t = now.getTime();
  for (const prayer of day.prayers) {
    if (prayer.key === "sunrise") continue;
    if (prayer.adhan.getTime() > t) return event(prayer, prayer.adhan, "adhan", t);
    if (prayer.iqamah && prayer.iqamah.getTime() > t) return event(prayer, prayer.iqamah, "iqamah", t);
  }
  return null;
}

function event(prayer: PrayerTime, at: Date, kind: NextPrayer["kind"], now: number): NextPrayer {
  return { prayer, at, kind, secondsUntil: Math.max(0, Math.ceil((at.getTime() - now) / 1000)) };
}

/**
 * Next prayer event from `now`: today's remaining adhan/iqamah, rolling over
 * to tomorrow's Fajr adhan after Isha's iqamah.
 */
export function getNextPrayer(now: Date, settings: PrayerConfig): NextPrayer {
  const today = getPrayerDay(now, settings);
  return nextEventInDay(today, now) ?? firstOfNextDay(today, now, settings);
}

function firstOfNextDay(today: PrayerDay, now: Date, settings: PrayerConfig): NextPrayer {
  const d = parseDayKey(today.date)!;
  const n = addDays(d.year, d.month, d.day, 1);
  const tomorrow = getPrayerDayFor(n.year, n.month, n.day, settings);
  return nextEventInDay(tomorrow, now)!;
}
