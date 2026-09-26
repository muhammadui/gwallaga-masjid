import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPrayerIcs, escapeIcsText, foldIcsLine } from "./ics";
import { getPrayerMonth } from "./month";
import { formatClock } from "./time";

const SETTINGS = {
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

test("ics: escapes TEXT per RFC 5545", () => {
  assert.equal(escapeIcsText("a,b;c\\d\ne"), "a\\,b\;c\\\\d\\ne");
});

test("ics: folds long lines at 75 octets", () => {
  const folded = foldIcsLine(`SUMMARY:${"x".repeat(200)}`);
  for (const line of folded.split("\r\n")) assert.ok(new TextEncoder().encode(line).length <= 75);
  assert.equal(folded.replace(/\r\n /g, ""), `SUMMARY:${"x".repeat(200)}`);
});

test("ics: one VEVENT per adhan with Lagos TZID", () => {
  const days = getPrayerMonth(2026, 9, SETTINGS);
  const ics = buildPrayerIcs(days, { calendarName: "Test, calendar", host: "example.org", now: new Date("2026-09-26T00:00:00Z") });
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n"));
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
  assert.equal(ics.match(/BEGIN:VEVENT/g)?.length, 30 * 5);
  assert.ok(ics.includes("X-WR-CALNAME:Test\\, calendar"));
  const fajr = formatClock(days[25].prayers[0].adhan).replace(":", "");
  assert.ok(ics.includes(`DTSTART;TZID=Africa/Lagos:20260926T${fajr}00`));
  assert.ok(ics.includes("UID:2026-09-26-fajr@example.org"));
  assert.ok(!ics.includes("sunrise@"));
});
