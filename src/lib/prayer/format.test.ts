import { test } from "node:test";
import assert from "node:assert/strict";
import { formatCountdown, formatDurationShort, formatStatus } from "./format";

test("format: countdown HH:MM:SS", () => {
  assert.equal(formatCountdown(4332), "01:12:12");
  assert.equal(formatCountdown(0), "00:00:00");
  assert.equal(formatCountdown(-5), "00:00:00");
  assert.equal(formatCountdown(36_000), "10:00:00");
});

test("format: short duration", () => {
  assert.equal(formatDurationShort(4320), "1h 12m");
  assert.equal(formatDurationShort(720), "12m");
  assert.equal(formatDurationShort(3600), "1h");
  assert.equal(formatDurationShort(10), "1m");
});

test("format: status line", () => {
  const prayer = { key: "asr" as const, nameEn: "Asr", nameAr: "العصر", adhan: new Date(), iqamah: null };
  const tpl = { adhanIn: "{prayer} in {time}", iqamahIn: "{prayer} iqamah in {time}" };
  assert.equal(formatStatus({ prayer, kind: "adhan", secondsUntil: 4320 }, tpl), "Asr in 1h 12m");
  assert.equal(formatStatus({ prayer, kind: "iqamah", secondsUntil: 480 }, tpl), "Asr iqamah in 8m");
});
