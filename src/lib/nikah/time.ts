/**
 * Africa/Lagos wall-clock helpers. Lagos is UTC+1 all year (no DST), so
 * conversions are a fixed offset; formatting still goes through Intl with the
 * named zone so output is correct on any server timezone.
 */
export const LAGOS_TZ = "Africa/Lagos";
const OFFSET_MS = 60 * 60 * 1000;

/** "YYYY-MM-DD" of `date` in Lagos. */
export function lagosYmd(date: Date = new Date()): string {
  return new Date(date.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

/** Lagos calendar year of `date`. */
export function lagosYear(date: Date = new Date()): number {
  return Number(lagosYmd(date).slice(0, 4));
}

/** UTC instant for a Lagos date ("YYYY-MM-DD") and time ("HH:mm"). */
export function lagosDateTime(ymd: string, hhmm: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  const [hh, mm] = hhmm.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm) - OFFSET_MS);
}

/** "HH:mm" of `date` in Lagos. */
export function lagosHhmm(date: Date): string {
  return new Date(date.getTime() + OFFSET_MS).toISOString().slice(11, 16);
}

/** Weekday (0 = Sunday) of a "YYYY-MM-DD" calendar date. */
export function weekdayOfYmd(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Add whole days to a "YYYY-MM-DD" date. */
export function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export const YMD_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const HHMM_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Booking window: from 2 days ahead to 90 days ahead (Lagos dates, inclusive). */
export function bookingWindow(now: Date = new Date()): { min: string; max: string } {
  const today = lagosYmd(now);
  return { min: addDaysYmd(today, 2), max: addDaysYmd(today, 90) };
}

/** "Saturday, 3 October 2026" */
export function formatLagosDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: LAGOS_TZ,
  }).format(date);
}

/** "Saturday, 3 October 2026 at 10:00" */
export function formatLagosDateTime(date: Date): string {
  return `${formatLagosDate(date)} at ${lagosHhmm(date)}`;
}

/** "3 Oct 2026, 10:00" (compact, for tables and timelines). */
export function formatLagosShort(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: LAGOS_TZ,
  }).format(date);
}

/** "Saturday 10:00", stored as NikahBooking.slotLabel. */
export function slotLabelFor(date: Date): string {
  const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: LAGOS_TZ }).format(date);
  return `${weekday} ${lagosHhmm(date)}`;
}
