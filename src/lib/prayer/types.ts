/** Keys of the six daily times (sunrise is shown but is not a prayer). */
export type PrayerKey = "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha";

/** The five prayers that carry an iqamah. */
export type SalahKey = Exclude<PrayerKey, "sunrise">;

export type CalculationMethodName = "Egyptian" | "MuslimWorldLeague" | "UmmAlQura";

/**
 * The subset of the PrayerSettings row the engine needs. Structurally
 * compatible with the Prisma model, but declared here so client components can
 * run the engine without importing anything from Prisma.
 */
export interface PrayerConfig {
  fajrIqamahOffset: number;
  dhuhrIqamahOffset: number;
  asrIqamahOffset: number;
  maghribIqamahOffset: number;
  ishaIqamahOffset: number;
  /** "HH:mm" Africa/Lagos. */
  jumuahFirst: string;
  jumuahSecond: string | null;
  /** -1, 0 or +1: applied to the Gregorian date before the Hijri lookup. */
  hijriOffsetDays: number;
  calculationMethod: string;
}

export interface HijriDate {
  day: number;
  /** 1 = Muharram … 12 = Dhul Hijjah. */
  month: number;
  monthName: string;
  monthNameAr: string;
  year: number;
  /** "15 Rabi al-Thani 1448 AH" */
  formatted: string;
}

export interface PrayerTime {
  key: PrayerKey;
  nameEn: string;
  nameAr: string;
  adhan: Date;
  /** Null for sunrise. On Fridays Dhuhr's iqamah is the first Jumu'ah. */
  iqamah: Date | null;
}

export interface PrayerDay {
  /** Calendar date in Africa/Lagos, "YYYY-MM-DD". */
  date: string;
  /** 0 = Sunday … 6 = Saturday (Africa/Lagos). */
  weekday: number;
  isFriday: boolean;
  hijri: HijriDate;
  prayers: PrayerTime[];
  /** Jumu'ah on this date when it is a Friday, otherwise the coming Friday. */
  jumuah: { first: Date; second?: Date };
  qiblaDegrees: number;
  method: CalculationMethodName;
}

/** JSON-safe PrayerDay (Dates as ISO strings) for the API and client props. */
export interface SerializedPrayerTime extends Omit<PrayerTime, "adhan" | "iqamah"> {
  adhan: string;
  iqamah: string | null;
}

export interface SerializedPrayerDay extends Omit<PrayerDay, "prayers" | "jumuah"> {
  prayers: SerializedPrayerTime[];
  jumuah: { first: string; second?: string };
}
