import { test } from "node:test";
import assert from "node:assert/strict";
import { makeReference, REFERENCE_PATTERN } from "./reference";

test("reference has the documented shape", () => {
  const ref = makeReference("NK", new Date("2026-09-26T12:00:00Z"));
  assert.match(ref, REFERENCE_PATTERN);
  assert.ok(ref.startsWith("GJM-NK-"));
  const ts = ref.split("-")[2];
  assert.equal(parseInt(ts, 36), new Date("2026-09-26T12:00:00Z").getTime());
});

test("prefix is normalised to uppercase alphanumerics", () => {
  assert.ok(makeReference("dn").startsWith("GJM-DN-"));
  assert.throws(() => makeReference("--"));
});

test("references are unique across rapid calls", () => {
  const now = new Date();
  const set = new Set(Array.from({ length: 500 }, () => makeReference("DN", now)));
  assert.ok(set.size >= 495); // 32^4 space per millisecond
});
