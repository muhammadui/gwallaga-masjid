import { test } from "node:test";
import assert from "node:assert/strict";
import { getPrayerDay, getPrayerDayFor } from "./engine";
import { getPrayerMonth } from "./month";
import { formatClock, zonedTime } from "./time";
import { QIBLA_DEGREES, compassPoint } from "./qibla";
import { serializePrayerDay, hydratePrayerDay } from "./serialize";
import type { PrayerConfig, PrayerKey } from "./types";

export const SETTINGS: PrayerConfig = {
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

const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
const clock = (day: ReturnType<typeof getPrayerDay>, key: PrayerKey) =>
  formatClock(day.prayers.find((p) => p.key === key)!.adhan);

/*
 * 2026-09-26, Bauchi (10.3158 N, 9.8442 E), Egyptian 19.5°/17.5°, Shafi.
 * adhan computes Fajr 04:54, Sunrise 06:10, Dhuhr 12:13, Asr 15:28,
 * Maghrib 18:14, Isha 19:22. The windows first proposed in the brief
 * (Fajr 05:05–05:15, Dhuhr 12:35–12:45 …) are ~20–30 min late: Bauchi sits at
 * 9.84°E inside a UTC+1 (15°E) zone, so solar noon is 12:20 minus the late-
 * September equation of time (~8.5 min) ≈ 12:12. Windows below are ±5 min
 * around the astronomical values.
 */
test("engine: Bauchi times for 2026-09-26 (Egyptian, Shafi)", () => {
  const day = getPrayerDayFor(2026, 9, 26, SETTINGS);
  const windows: Record<PrayerKey, [string, string]> = {
    fajr: ["04:49", "04:59"],
    sunrise: ["06:05", "06:15"],
    dhuhr: ["12:08", "12:18"],
    asr: ["15:23", "15:33"],
    maghrib: ["18:09", "18:19"],
    isha: ["19:17", "19:27"],
  };
  for (const [key, [lo, hi]] of Object.entries(windows) as [PrayerKey, [string, string]][]) {
    const got = toMin(clock(day, key));
    assert.ok(got >= toMin(lo) && got <= toMin(hi), `${key} ${clock(day, key)} outside ${lo}–${hi}`);
  }
  assert.equal(day.date, "2026-09-26");
  assert.equal(day.weekday, 6);
  assert.equal(day.method, "Egyptian");
});

test("engine: iqamah = adhan + offset; sunrise has none", () => {
  const day = getPrayerDayFor(2026, 9, 26, SETTINGS);
  const fajr = day.prayers.find((p) => p.key === "fajr")!;
  const maghrib = day.prayers.find((p) => p.key === "maghrib")!;
  assert.equal(fajr.iqamah!.getTime() - fajr.adhan.getTime(), 25 * 60_000);
  assert.equal(maghrib.iqamah!.getTime() - maghrib.adhan.getTime(), 5 * 60_000);
  assert.equal(day.prayers.find((p) => p.key === "sunrise")!.iqamah, null);
  assert.deepEqual(
    day.prayers.map((p) => p.key),
    ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"],
  );
  assert.equal(day.prayers[0].nameAr, "الفجر");
});

test("engine: Friday replaces Dhuhr iqamah with the first Jumu'ah", () => {
  const settings = { ...SETTINGS, jumuahFirst: "13:15", jumuahSecond: "14:15" };
  const fri = getPrayerDayFor(2026, 9, 25, settings);
  assert.equal(fri.isFriday, true);
  const dhuhr = fri.prayers.find((p) => p.key === "dhuhr")!;
  assert.equal(dhuhr.nameEn, "Jumu'ah");
  assert.equal(formatClock(dhuhr.iqamah!), "13:15");
  assert.equal(dhuhr.iqamah!.getTime(), fri.jumuah.first.getTime());
  assert.equal(formatClock(fri.jumuah.second!), "14:15");

  // Saturday: ordinary Dhuhr, Jumu'ah points at the coming Friday (2 Oct).
  const sat = getPrayerDayFor(2026, 9, 26, settings);
  const satDhuhr = sat.prayers.find((p) => p.key === "dhuhr")!;
  assert.equal(satDhuhr.nameEn, "Dhuhr");
  assert.equal(satDhuhr.iqamah!.getTime() - satDhuhr.adhan.getTime(), 15 * 60_000);
  assert.equal(sat.jumuah.first.getTime(), zonedTime(2026, 10, 2, 13, 15).getTime());
});

test("engine: result does not depend on the process time zone", () => {
  const original = process.env.TZ;
  const instant = new Date("2026-09-26T09:00:00Z");
  try {
    process.env.TZ = "UTC";
    const a = serializePrayerDay(getPrayerDay(instant, SETTINGS));
    process.env.TZ = "Pacific/Kiritimati"; // UTC+14
    const b = serializePrayerDay(getPrayerDay(instant, SETTINGS));
    process.env.TZ = "America/Los_Angeles";
    const c = serializePrayerDay(getPrayerDay(instant, SETTINGS));
    assert.deepEqual(a, b);
    assert.deepEqual(a, c);
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});

test("engine: an instant late on 26 Sept UTC is still 27 Sept in Lagos", () => {
  // 23:30 UTC = 00:30 Lagos next day.
  assert.equal(getPrayerDay(new Date("2026-09-26T23:30:00Z"), SETTINGS).date, "2026-09-27");
});

test("engine: calculation method switches parameters", () => {
  const eg = getPrayerDayFor(2026, 9, 26, SETTINGS);
  const uq = getPrayerDayFor(2026, 9, 26, { ...SETTINGS, calculationMethod: "UmmAlQura" });
  const maghrib = uq.prayers.find((p) => p.key === "maghrib")!.adhan;
  const isha = uq.prayers.find((p) => p.key === "isha")!.adhan;
  assert.equal(uq.method, "UmmAlQura");
  assert.equal(Math.round((isha.getTime() - maghrib.getTime()) / 60_000), 90);
  assert.notEqual(clock(eg, "fajr"), clock(uq, "fajr"));
  // Unknown names fall back to Egyptian.
  assert.equal(getPrayerDayFor(2026, 9, 26, { ...SETTINGS, calculationMethod: "Nope" }).method, "Egyptian");
});

test("qibla: Bauchi bearing ≈ 65° NE", () => {
  assert.ok(QIBLA_DEGREES > 60 && QIBLA_DEGREES < 70, String(QIBLA_DEGREES));
  assert.equal(compassPoint(QIBLA_DEGREES), "NE");
  assert.equal(compassPoint(0), "N");
  assert.equal(compassPoint(359), "N");
  assert.equal(compassPoint(200), "S");
});

test("month: every day of September 2026, in order", () => {
  const month = getPrayerMonth(2026, 9, SETTINGS);
  assert.equal(month.length, 30);
  assert.equal(month[0].date, "2026-09-01");
  assert.equal(month[29].date, "2026-09-30");
  assert.equal(getPrayerMonth(2028, 2, SETTINGS).length, 29);
});

test("serialize: round-trips through JSON", () => {
  const day = getPrayerDayFor(2026, 9, 25, { ...SETTINGS, jumuahSecond: "14:00" });
  const back = hydratePrayerDay(JSON.parse(JSON.stringify(serializePrayerDay(day))));
  assert.deepEqual(back, day);
});
