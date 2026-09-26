"use client";

import type { PrayerConfig, SerializedPrayerDay } from "@/lib/prayer";
import { formatStatus } from "@/lib/prayer/format";
import { t } from "@/i18n/en";
import { cn } from "@/lib/utils";
import { useLivePrayer } from "./use-live-prayer";

/** "Asr in 1h 12m", live. Polite live region updates at most once a minute (text changes by minute). */
export function StatusLine({
  day,
  config,
  serverNow,
  className,
}: {
  day: SerializedPrayerDay;
  config: PrayerConfig;
  serverNow: number;
  className?: string;
}) {
  const { next } = useLivePrayer(day, config, serverNow);
  return (
    <p className={cn("inline-flex items-center gap-2.5 tabular-nums", className)}>
      <span aria-hidden className="relative flex size-1.5">
        <span className="absolute inset-0 animate-ping rounded-full bg-indigo/40 motion-reduce:hidden" />
        <span className="relative size-1.5 rounded-full bg-indigo" />
      </span>
      <span aria-live="polite">{formatStatus(next, t.prayer.status)}</span>
    </p>
  );
}
