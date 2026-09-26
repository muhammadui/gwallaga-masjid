import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TRANSITIONS,
  TransitionError,
  acceptsPayment,
  assertTransition,
  canReschedule,
  canTransition,
  effectiveStatus,
  timelineIndex,
  type NikahStatusValue,
} from "./state";

const ALL = Object.keys(TRANSITIONS) as NikahStatusValue[];

test("happy path is allowed step by step", () => {
  assert.ok(canTransition("PENDING_PAYMENT", "PAID"));
  assert.ok(canTransition("PAID", "CONFIRMED"));
  assert.ok(canTransition("CONFIRMED", "SOLEMNIZED"));
});

test("steps cannot be skipped or reversed", () => {
  assert.ok(!canTransition("PENDING_PAYMENT", "CONFIRMED"));
  assert.ok(!canTransition("PAID", "SOLEMNIZED"));
  assert.ok(!canTransition("CONFIRMED", "PAID"));
  assert.ok(!canTransition("PAID", "PENDING_PAYMENT"));
  assert.throws(() => assertTransition("PENDING_PAYMENT", "SOLEMNIZED"), TransitionError);
});

test("terminal states have no exits", () => {
  for (const to of ALL) {
    assert.ok(!canTransition("SOLEMNIZED", to));
    assert.ok(!canTransition("CANCELLED", to));
  }
});

test("open states can be cancelled; late payment revives an expired booking", () => {
  for (const s of ["PENDING_PAYMENT", "PAID", "CONFIRMED", "EXPIRED"] as const) assert.ok(canTransition(s, "CANCELLED"));
  assert.ok(canTransition("EXPIRED", "PAID"));
  assert.ok(!canTransition("EXPIRED", "CONFIRMED"));
});

test("helpers agree with the table", () => {
  assert.ok(acceptsPayment("PENDING_PAYMENT") && acceptsPayment("EXPIRED") && !acceptsPayment("PAID"));
  assert.ok(canReschedule("CONFIRMED") && !canReschedule("SOLEMNIZED") && !canReschedule("CANCELLED"));
  assert.equal(timelineIndex("CONFIRMED"), 2);
  assert.equal(timelineIndex("CANCELLED"), -1);
  const now = new Date("2026-09-26T12:00:00Z");
  assert.equal(effectiveStatus({ status: "PENDING_PAYMENT", expiresAt: new Date("2026-09-26T11:00:00Z") }, now), "EXPIRED");
  assert.equal(effectiveStatus({ status: "PENDING_PAYMENT", expiresAt: new Date("2026-09-27T11:00:00Z") }, now), "PENDING_PAYMENT");
  assert.equal(effectiveStatus({ status: "PAID", expiresAt: null }, now), "PAID");
});
