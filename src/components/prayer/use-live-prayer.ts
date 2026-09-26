"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getNextPrayer,
  getPrayerDayFor,
  hydratePrayerDay,
  lagosDayKey,
  nextEventInDay,
  parseDayKey,
  type NextPrayer,
  type PrayerConfig,
  type PrayerDay,
  type SerializedPrayerDay,
} from "@/lib/prayer";
import { useNow } from "./use-now";

export interface LivePrayerOptions {
  /**
   * When the Lagos day changes (midnight), fetch the new day from
   * /api/prayer-times so admin edits made since the page was cached show up.
   * The engine fills in immediately while the request is in flight.
   */
  refetch?: boolean;
}

export interface LivePrayer {
  now: number;
  day: PrayerDay;
  next: NextPrayer;
  hydrated: boolean;
}

/**
 * Today's PrayerDay and the next adhan/iqamah, live. `serverNow` is the
 * server's render time: used until hydration so markup matches.
 */
export function useLivePrayer(
  initial: SerializedPrayerDay,
  config: PrayerConfig,
  serverNow: number,
  { refetch = false }: LivePrayerOptions = {},
): LivePrayer {
  const live = useNow();
  const now = live ?? serverNow;
  const todayKey = lagosDayKey(new Date(now));
  const [fetched, setFetched] = useState<SerializedPrayerDay | null>(null);
  const attempted = useRef<string | null>(null);

  const source = fetched?.date === todayKey ? fetched : initial.date === todayKey ? initial : null;

  useEffect(() => {
    if (!refetch || live === null || source || attempted.current === todayKey) return;
    attempted.current = todayKey;
    const ctrl = new AbortController();
    fetch(`/api/prayer-times?date=${todayKey}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? (r.json() as Promise<SerializedPrayerDay>) : null))
      .then((d) => {
        if (d) setFetched(d);
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [refetch, live, source, todayKey]);

  const day = useMemo(() => {
    if (source) return hydratePrayerDay(source);
    const d = parseDayKey(todayKey)!;
    return getPrayerDayFor(d.year, d.month, d.day, config);
  }, [source, todayKey, config]);

  const at = new Date(now);
  const next = nextEventInDay(day, at) ?? getNextPrayer(at, config);
  return { now, day, next, hydrated: live !== null };
}
