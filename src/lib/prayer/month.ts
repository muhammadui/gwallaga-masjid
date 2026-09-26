import { getPrayerDayFor } from "./engine";
import { daysInMonth } from "./time";
import type { PrayerConfig, PrayerDay } from "./types";

/** Every day of a Gregorian month (month is 1–12). */
export function getPrayerMonth(year: number, month: number, settings: PrayerConfig): PrayerDay[] {
  return Array.from({ length: daysInMonth(year, month) }, (_, i) => getPrayerDayFor(year, month, i + 1, settings));
}
