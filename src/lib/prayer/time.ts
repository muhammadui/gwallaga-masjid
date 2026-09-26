import { MASJID_TIME_ZONE } from "./constants";

/**
 * Time-zone maths for Africa/Lagos done with Intl, never the process TZ, so
 * the same instant produces the same calendar day on Vercel (UTC), a laptop in
 * London and a phone in Bauchi.
 */

export interface ZonedParts {
  year: number;
  month: number; // 1–12
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number; // 0 = Sunday
}

const formatters = new Map<string, Intl.DateTimeFormat>();
function partsFormatter(timeZone: string) {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      weekday: "short",
    });
    formatters.set(timeZone, f);
  }
  return f;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Wall-clock components of `date` in `timeZone`. */
export function zonedParts(date: Date, timeZone: string = MASJID_TIME_ZONE): ZonedParts {
  const out: Record<string, string> = {};
  for (const p of partsFormatter(timeZone).formatToParts(date)) out[p.type] = p.value;
  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    hour: Number(out.hour) % 24,
    minute: Number(out.minute),
    second: Number(out.second),
    weekday: WEEKDAYS.indexOf(out.weekday),
  };
}

/** Offset (ms) of `timeZone` from UTC at `instant`. */
function offsetMs(instant: number, timeZone: string): number {
  const p = zonedParts(new Date(instant), timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/** The instant at which the wall clock in `timeZone` reads the given time. */
export function zonedTime(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  timeZone: string = MASJID_TIME_ZONE,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const first = guess - offsetMs(guess, timeZone);
  // Second pass settles DST edges (Lagos has none, but stay correct).
  return new Date(guess - offsetMs(first, timeZone));
}

/** "YYYY-MM-DD" for a calendar day. */
export function dayKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** The Lagos calendar day of an instant, "YYYY-MM-DD". */
export function lagosDayKey(date: Date): string {
  const p = zonedParts(date);
  return dayKey(p.year, p.month, p.day);
}

/** Parse "YYYY-MM-DD" (strict). Returns null when invalid. */
export function parseDayKey(key: string): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return { year, month, day };
}

/** Parse "YYYY-MM" (strict). */
export function parseMonthKey(key: string): { year: number; month: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12 || year < 1900 || year > 2200) return null;
  return { year, month };
}

/** Calendar arithmetic on a day, independent of any time zone. */
export function addDays(year: number, month: number, day: number, days: number) {
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), weekday: d.getUTCDay() };
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Parse "HH:mm" (24h). */
export function parseClock(value: string): { hour: number; minute: number } | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  return m ? { hour: Number(m[1]), minute: Number(m[2]) } : null;
}

const clockFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: MASJID_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "HH:mm" in Africa/Lagos. */
export function formatClock(date: Date | string): string {
  return clockFormat.format(typeof date === "string" ? new Date(date) : date);
}

/** "Saturday 26 September 2026" in Africa/Lagos. */
export function formatLongDate(date: Date, opts: { weekday?: boolean } = { weekday: true }): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: MASJID_TIME_ZONE,
    weekday: opts.weekday ? "long" : undefined,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
