import { test } from "node:test";
import assert from "node:assert/strict";
import { hijriForDay } from "./hijri";
import { getPrayerDayFor } from "./engine";

test("hijri: 26 Sept 2026 is 15 Rabi al-Thani 1448 (Umm al-Qura)", () => {
  const h = hijriForDay(2026, 9, 26);
  assert.deepEqual(
    { day: h.day, month: h.month, year: h.year, monthName: h.monthName },
    { day: 15, month: 4, year: 1448, monthName: "Rabi al-Thani" },
  );
  assert.equal(h.monthNameAr, "ربيع الآخر");
  assert.equal(h.formatted, "15 Rabi al-Thani 1448 AH");
});

test("hijri: offset +1 / -1 shifts the day", () => {
  assert.equal(hijriForDay(2026, 9, 26, 1).day, 16);
  assert.equal(hijriForDay(2026, 9, 26, -1).day, 14);
});

test("hijri: offset crosses month boundaries", () => {
  // Find the first day of a Hijri month and check -1 lands in the previous one.
  let d = 1;
  while (hijriForDay(2026, 10, d).day !== 1) d++;
  const first = hijriForDay(2026, 10, d);
  const prev = hijriForDay(2026, 10, d, -1);
  assert.equal(prev.month, first.month === 1 ? 12 : first.month - 1);
  assert.ok(prev.day >= 29);
});

test("hijri: Ramadan 1448 falls in Feb/Mar 2027", () => {
  const h = hijriForDay(2027, 2, 20);
  assert.equal(h.monthName, "Ramadan");
  assert.equal(h.year, 1448);
});

test("hijri: engine applies hijriOffsetDays", () => {
  const base = {
    fajrIqamahOffset: 25,
    dhuhrIqamahOffset: 15,
    asrIqamahOffset: 15,
    maghribIqamahOffset: 5,
    ishaIqamahOffset: 15,
    jumuahFirst: "13:30",
    jumuahSecond: null,
    calculationMethod: "Egyptian",
  };
  assert.equal(getPrayerDayFor(2026, 9, 26, { ...base, hijriOffsetDays: 1 }).hijri.day, 16);
  assert.equal(getPrayerDayFor(2026, 9, 26, { ...base, hijriOffsetDays: -1 }).hijri.day, 14);
});
