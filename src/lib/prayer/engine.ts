import { CalculationMethod, Coordinates, Madhab, PrayerTimes } from "adhan";
import { BAUCHI, IQAMAH_OFFSET_FIELD, JUMUAH_NAME, PRAYER_KEYS, PRAYER_NAMES, normalizeMethod } from "./constants";
import { hijriForDay } from "./hijri";
import { QIBLA_DEGREES } from "./qibla";
import { addDays, dayKey, parseClock, zonedParts, zonedTime } from "./time";
import type { PrayerConfig, PrayerDay, PrayerTime } from "./types";

const COORDS = new Coordinates(BAUCHI.latitude, BAUCHI.longitude);
const MINUTE = 60_000;

function parameters(method: string) {
  const params = CalculationMethod[normalizeMethod(method)]();
  params.madhab = Madhab.Shafi;
  return params;
}

function clockOn(year: number, month: number, day: number, value: string | null | undefined): Date | undefined {
  const c = value ? parseClock(value) : null;
  return c ? zonedTime(year, month, day, c.hour, c.minute) : undefined;
}

/**
 * Prayer times for one calendar day in Bauchi.
 *
 * `date` is any instant: the day is the Africa/Lagos calendar day containing
 * it. adhan reads the year/month/day from the Date's *local* fields and
 * returns UTC instants, so we hand it a local-midnight Date built from the
 * Lagos day: correct whatever the process TZ is.
 */
export function getPrayerDayFor(year: number, month: number, day: number, settings: PrayerConfig): PrayerDay {
  const method = normalizeMethod(settings.calculationMethod);
  const times = new PrayerTimes(COORDS, new Date(year, month - 1, day), parameters(method));
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const isFriday = weekday === 5;

  // Jumu'ah: this day if Friday, else the coming Friday.
  const fri = addDays(year, month, day, (5 - weekday + 7) % 7);
  const first =
    clockOn(fri.year, fri.month, fri.day, settings.jumuahFirst) ?? zonedTime(fri.year, fri.month, fri.day, 13, 30);
  const second = clockOn(fri.year, fri.month, fri.day, settings.jumuahSecond);

  const prayers: PrayerTime[] = PRAYER_KEYS.map((key) => {
    const adhan = times[key];
    if (key === "sunrise") {
      return { key, nameEn: PRAYER_NAMES.sunrise.en, nameAr: PRAYER_NAMES.sunrise.ar, adhan, iqamah: null };
    }
    if (key === "dhuhr" && isFriday) {
      return { key, nameEn: JUMUAH_NAME.en, nameAr: JUMUAH_NAME.ar, adhan, iqamah: first };
    }
    const offset = settings[IQAMAH_OFFSET_FIELD[key]];
    return {
      key,
      nameEn: PRAYER_NAMES[key].en,
      nameAr: PRAYER_NAMES[key].ar,
      adhan,
      iqamah: new Date(adhan.getTime() + offset * MINUTE),
    };
  });

  return {
    date: dayKey(year, month, day),
    weekday,
    isFriday,
    hijri: hijriForDay(year, month, day, settings.hijriOffsetDays),
    prayers,
    jumuah: second ? { first, second } : { first },
    qiblaDegrees: QIBLA_DEGREES,
    method,
  };
}

/** Prayer times for the Africa/Lagos calendar day containing `date`. */
export function getPrayerDay(date: Date, settings: PrayerConfig): PrayerDay {
  const p = zonedParts(date);
  return getPrayerDayFor(p.year, p.month, p.day, settings);
}
