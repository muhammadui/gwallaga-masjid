/**
 * Hijri date string for certificates and emails, e.g. "20 Rabiʻ II 1448 AH".
 * Uses Intl's islamic-umalqura calendar in Africa/Lagos, shifted by the
 * masjid's moon-sighting offset (PrayerSettings.hijriOffsetDays).
 * Kept local to the nikah module on purpose (no dependency on src/lib/prayer).
 */
export function hijriString(date: Date, offsetDays = 0): string {
  const shifted = new Date(date.getTime() + offsetDays * 86_400_000);
  const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).formatToParts(shifted);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const year = get("year").replace(/\D/g, "") || get("relatedYear");
  return `${get("day")} ${get("month")} ${year} AH`.replace(/\s+/g, " ").trim();
}
