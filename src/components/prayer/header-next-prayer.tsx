"use client";

import { formatClock, type PrayerConfig, type SerializedPrayerDay } from "@/lib/prayer";
import { t } from "@/i18n/en";
import { useLivePrayer } from "./use-live-prayer";

/**
 * "Asr 15:58" for the header pill. Fetches nothing: rolls over to tomorrow's
 * Fajr client-side with the engine.
 */
export function HeaderNextPrayer({
  day,
  config,
  serverNow,
}: {
  day: SerializedPrayerDay;
  config: PrayerConfig;
  serverNow: number;
}) {
  const { next } = useLivePrayer(day, config, serverNow);
  return (
    <span>
      {next.prayer.nameEn}
      {next.kind === "iqamah" ? <span className="font-normal text-muted"> {t.prayer.iqamahLabel}</span> : null}{" "}
      <time dateTime={next.at.toISOString()}>{formatClock(next.at)}</time>
    </span>
  );
}
