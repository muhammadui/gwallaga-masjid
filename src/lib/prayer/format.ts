import type { NextPrayer } from "./next-prayer";
import type { PrayerConfig } from "./types";

/** 4332 → "01:12:12" */
export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return [h, m, s % 60].map((n) => String(n).padStart(2, "0")).join(":");
}

/** 4332 → "1h 12m", 720 → "12m", 30 → "1m" (never "0m"). */
export function formatDurationShort(seconds: number): string {
  const totalMin = Math.max(1, Math.ceil(seconds / 60));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** "Asr in 1h 12m" / "Asr iqamah in 8m", from the templates passed in. */
export function formatStatus(
  next: Pick<NextPrayer, "prayer" | "kind" | "secondsUntil">,
  templates: { adhanIn: string; iqamahIn: string },
): string {
  const tpl = next.kind === "adhan" ? templates.adhanIn : templates.iqamahIn;
  return tpl.replace("{prayer}", next.prayer.nameEn).replace("{time}", formatDurationShort(next.secondsUntil));
}

/** Pick the engine's fields off a settings row (drops Dates for client props). */
export function toPrayerConfig(s: PrayerConfig): PrayerConfig {
  return {
    fajrIqamahOffset: s.fajrIqamahOffset,
    dhuhrIqamahOffset: s.dhuhrIqamahOffset,
    asrIqamahOffset: s.asrIqamahOffset,
    maghribIqamahOffset: s.maghribIqamahOffset,
    ishaIqamahOffset: s.ishaIqamahOffset,
    jumuahFirst: s.jumuahFirst,
    jumuahSecond: s.jumuahSecond,
    hijriOffsetDays: s.hijriOffsetDays,
    calculationMethod: s.calculationMethod,
  };
}
