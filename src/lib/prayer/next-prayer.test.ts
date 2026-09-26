import { test } from "node:test";
import assert from "node:assert/strict";
import { getPrayerDayFor } from "./engine";
import { getNextPrayer } from "./next-prayer";
import { formatClock, zonedTime } from "./time";
import type { PrayerConfig } from "./types";

const SETTINGS: PrayerConfig = {
  fajrIqamahOffset: 25,
  dhuhrIqamahOffset: 15,
  asrIqamahOffset: 15,
  maghribIqamahOffset: 5,
  ishaIqamahOffset: 15,
  jumuahFirst: "13:30",
  jumuahSecond: null,
  hijriOffsetDays: 0,
  calculationMethod: "Egyptian",
};

const today = getPrayerDayFor(2026, 9, 26, SETTINGS);
const get = (key: string) => today.prayers.find((p) => p.key === key)!;

test("next: before Fajr → today's Fajr adhan", () => {
  const next = getNextPrayer(zonedTime(2026, 9, 26, 1, 0), SETTINGS);
  assert.equal(next.prayer.key, "fajr");
  assert.equal(next.kind, "adhan");
  assert.equal(next.at.getTime(), get("fajr").adhan.getTime());
});

test("next: between adhan and iqamah → iqamah of the same prayer", () => {
  const asr = get("asr");
  const now = new Date(asr.adhan.getTime() + 60_000);
  const next = getNextPrayer(now, SETTINGS);
  assert.equal(next.prayer.key, "asr");
  assert.equal(next.kind, "iqamah");
  assert.equal(next.secondsUntil, 14 * 60);
});

test("next: sunrise is skipped (after Fajr iqamah → Dhuhr)", () => {
  const now = new Date(get("fajr").iqamah!.getTime() + 1000);
  assert.equal(getNextPrayer(now, SETTINGS).prayer.key, "dhuhr");
});

test("next: after Isha iqamah rolls over to tomorrow's Fajr", () => {
  const now = new Date(get("isha").iqamah!.getTime() + 60_000);
  const next = getNextPrayer(now, SETTINGS);
  const tomorrow = getPrayerDayFor(2026, 9, 27, SETTINGS);
  assert.equal(next.prayer.key, "fajr");
  assert.equal(next.kind, "adhan");
  assert.equal(next.at.getTime(), tomorrow.prayers[0].adhan.getTime());
  assert.ok(next.secondsUntil > 8 * 3600 && next.secondsUntil < 10 * 3600, String(next.secondsUntil));
});

test("next: just before midnight Lagos also rolls over", () => {
  const next = getNextPrayer(zonedTime(2026, 9, 26, 23, 59), SETTINGS);
  assert.equal(next.prayer.key, "fajr");
  assert.equal(formatClock(next.at), formatClock(getPrayerDayFor(2026, 9, 27, SETTINGS).prayers[0].adhan));
});

test("next: on Friday the Dhuhr iqamah is the Jumu'ah time", () => {
  const fri = getPrayerDayFor(2026, 9, 25, SETTINGS);
  const dhuhr = fri.prayers.find((p) => p.key === "dhuhr")!;
  const next = getNextPrayer(new Date(dhuhr.adhan.getTime() + 60_000), SETTINGS);
  assert.equal(next.prayer.nameEn, "Jumu'ah");
  assert.equal(next.kind, "iqamah");
  assert.equal(formatClock(next.at), "13:30");
});
