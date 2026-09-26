import type { CalculationMethodName, PrayerKey, SalahKey } from "./types";

/** Gwallaga Juma'at Masjid, Bauchi. */
export const BAUCHI = { latitude: 10.3158, longitude: 9.8442 } as const;
export const MASJID_TIME_ZONE = "Africa/Lagos";

export const PRAYER_KEYS: readonly PrayerKey[] = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];
export const SALAH_KEYS: readonly SalahKey[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

export const PRAYER_NAMES: Record<PrayerKey, { en: string; ar: string }> = {
  fajr: { en: "Fajr", ar: "الفجر" },
  sunrise: { en: "Sunrise", ar: "الشروق" },
  dhuhr: { en: "Dhuhr", ar: "الظهر" },
  asr: { en: "Asr", ar: "العصر" },
  maghrib: { en: "Maghrib", ar: "المغرب" },
  isha: { en: "Isha", ar: "العشاء" },
};

export const JUMUAH_NAME = { en: "Jumu'ah", ar: "الجمعة" } as const;

export const CALCULATION_METHODS: readonly CalculationMethodName[] = ["Egyptian", "MuslimWorldLeague", "UmmAlQura"];

export const CALCULATION_METHOD_LABELS: Record<CalculationMethodName, string> = {
  Egyptian: "Egyptian General Authority (Fajr 19.5°, Isha 17.5°)",
  MuslimWorldLeague: "Muslim World League (Fajr 18°, Isha 17°)",
  UmmAlQura: "Umm al-Qura, Makkah (Fajr 18.5°, Isha 90 min)",
};

export function normalizeMethod(name: string | null | undefined): CalculationMethodName {
  return (CALCULATION_METHODS as readonly string[]).includes(name ?? "") ? (name as CalculationMethodName) : "Egyptian";
}

export const IQAMAH_OFFSET_FIELD: Record<SalahKey, "fajrIqamahOffset" | "dhuhrIqamahOffset" | "asrIqamahOffset" | "maghribIqamahOffset" | "ishaIqamahOffset"> = {
  fajr: "fajrIqamahOffset",
  dhuhr: "dhuhrIqamahOffset",
  asr: "asrIqamahOffset",
  maghrib: "maghribIqamahOffset",
  isha: "ishaIqamahOffset",
};
