import { test } from "node:test";
import assert from "node:assert/strict";
import { addDaysYmd, bookingWindow, lagosDateTime, lagosHhmm, lagosYmd, slotLabelFor, weekdayOfYmd } from "./time";
import { hijriString } from "./hijri-string";

test("Lagos wall clock is UTC+1", () => {
  const d = lagosDateTime("2026-10-03", "10:00");
  assert.equal(d.toISOString(), "2026-10-03T09:00:00.000Z");
  assert.equal(lagosHhmm(d), "10:00");
  assert.equal(lagosYmd(new Date("2026-12-31T23:30:00Z")), "2027-01-01");
  assert.equal(slotLabelFor(d), "Saturday 10:00");
  assert.equal(weekdayOfYmd("2026-10-03"), 6);
  assert.equal(addDaysYmd("2026-12-31", 1), "2027-01-01");
});

test("booking window is +2 to +90 days", () => {
  assert.deepEqual(bookingWindow(new Date("2026-09-26T10:00:00Z")), { min: "2026-09-28", max: "2026-12-25" });
});

test("hijri string has day, month, year and AH, and honours the offset", () => {
  const d = new Date("2026-10-03T09:00:00Z");
  const s = hijriString(d);
  assert.match(s, /^\d{1,2} .+ 14\d\d AH$/);
  assert.notEqual(hijriString(d, 1), s);
});
