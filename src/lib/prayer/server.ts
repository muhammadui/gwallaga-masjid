import "server-only";
import { cache } from "react";
import { getPrayerSettings } from "@/lib/settings";
import { getPrayerDay } from "./engine";
import { toPrayerConfig } from "./format";
import { getPrayerMonth } from "./month";
import { serializePrayerDay } from "./serialize";

/**
 * One consistent snapshot per request for the layout (header pill) and the
 * page (hero status, prayer strip): render time, engine config and today's
 * PrayerDay (JSON-safe). Request-deduped so every widget agrees.
 */
export const getPrayerSnapshot = cache(async () => {
  const config = toPrayerConfig(await getPrayerSettings());
  const serverNow = Date.now();
  const today = serializePrayerDay(getPrayerDay(new Date(serverNow), config));
  return { serverNow, config, today };
});

/** Every PrayerDay of a month from the stored settings. */
export async function getStoredPrayerMonth(year: number, month: number) {
  return getPrayerMonth(year, month, await getPrayerSettings());
}
