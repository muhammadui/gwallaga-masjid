import type { HijriDate } from "./types";

export const HIJRI_MONTHS: readonly { en: string; ar: string }[] = [
  { en: "Muharram", ar: "محرم" },
  { en: "Safar", ar: "صفر" },
  { en: "Rabi al-Awwal", ar: "ربيع الأول" },
  { en: "Rabi al-Thani", ar: "ربيع الآخر" },
  { en: "Jumada al-Ula", ar: "جمادى الأولى" },
  { en: "Jumada al-Akhirah", ar: "جمادى الآخرة" },
  { en: "Rajab", ar: "رجب" },
  { en: "Sha'ban", ar: "شعبان" },
  { en: "Ramadan", ar: "رمضان" },
  { en: "Shawwal", ar: "شوال" },
  { en: "Dhul Qa'dah", ar: "ذو القعدة" },
  { en: "Dhul Hijjah", ar: "ذو الحجة" },
];

const umalqura = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * Umm al-Qura Hijri date for a Gregorian calendar day (as understood in
 * Bauchi), shifted by the admin's moon-sighting offset (-1/0/+1) first.
 */
export function hijriForDay(year: number, month: number, day: number, offsetDays = 0): HijriDate {
  // Noon UTC keeps the lookup on the intended civil day.
  const shifted = new Date(Date.UTC(year, month - 1, day + offsetDays, 12));
  const parts: Record<string, string> = {};
  for (const p of umalqura.formatToParts(shifted)) parts[p.type] = p.value;
  const hDay = Number(parts.day);
  const hMonth = Number(parts.month);
  const hYear = Number.parseInt(parts.year ?? parts.relatedYear ?? "0", 10);
  const names = HIJRI_MONTHS[hMonth - 1] ?? HIJRI_MONTHS[0];
  return {
    day: hDay,
    month: hMonth,
    monthName: names.en,
    monthNameAr: names.ar,
    year: hYear,
    formatted: `${hDay} ${names.en} ${hYear} AH`,
  };
}
