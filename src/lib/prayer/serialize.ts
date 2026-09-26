import type { PrayerDay, SerializedPrayerDay } from "./types";

/** PrayerDay → JSON-safe (ISO strings). */
export function serializePrayerDay(day: PrayerDay): SerializedPrayerDay {
  return {
    ...day,
    prayers: day.prayers.map((p) => ({ ...p, adhan: p.adhan.toISOString(), iqamah: p.iqamah?.toISOString() ?? null })),
    jumuah: {
      first: day.jumuah.first.toISOString(),
      ...(day.jumuah.second ? { second: day.jumuah.second.toISOString() } : {}),
    },
  };
}

/** JSON → PrayerDay with real Dates. */
export function hydratePrayerDay(day: SerializedPrayerDay): PrayerDay {
  return {
    ...day,
    prayers: day.prayers.map((p) => ({ ...p, adhan: new Date(p.adhan), iqamah: p.iqamah ? new Date(p.iqamah) : null })),
    jumuah: {
      first: new Date(day.jumuah.first),
      ...(day.jumuah.second ? { second: new Date(day.jumuah.second) } : {}),
    },
  };
}
