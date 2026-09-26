import { test } from "node:test";
import assert from "node:assert/strict";
import { prayerSettingsSchema } from "./prayer";

const valid = {
  fajrIqamahOffset: 25,
  dhuhrIqamahOffset: 15,
  asrIqamahOffset: 15,
  maghribIqamahOffset: 5,
  ishaIqamahOffset: 15,
  jumuahFirst: "13:30",
  jumuahSecond: "",
  hijriOffsetDays: 0,
  calculationMethod: "Egyptian",
};

test("prayer settings: accepts defaults", () => {
  assert.equal(prayerSettingsSchema.safeParse(valid).success, true);
});

test("prayer settings: rejects bad clock, offsets and method", () => {
  assert.equal(prayerSettingsSchema.safeParse({ ...valid, jumuahFirst: "1:30pm" }).success, false);
  assert.equal(prayerSettingsSchema.safeParse({ ...valid, fajrIqamahOffset: -1 }).success, false);
  assert.equal(prayerSettingsSchema.safeParse({ ...valid, ishaIqamahOffset: 120 }).success, false);
  assert.equal(prayerSettingsSchema.safeParse({ ...valid, hijriOffsetDays: 2 }).success, false);
  assert.equal(prayerSettingsSchema.safeParse({ ...valid, calculationMethod: "Karachi" }).success, false);
});

test("prayer settings: second Jumu'ah must follow the first", () => {
  assert.equal(prayerSettingsSchema.safeParse({ ...valid, jumuahSecond: "14:30" }).success, true);
  const bad = prayerSettingsSchema.safeParse({ ...valid, jumuahSecond: "13:00" });
  assert.equal(bad.success, false);
  assert.deepEqual(bad.error?.issues[0].path, ["jumuahSecond"]);
});
