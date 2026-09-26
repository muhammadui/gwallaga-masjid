import { test } from "node:test";
import assert from "node:assert/strict";
import { signBookingToken, verifyBookingToken } from "./token";

const SECRET = "test-secret-please-ignore";

test("tokens are deterministic, url-safe and 32 chars", () => {
  const a = signBookingToken("NK-2026-0142", SECRET);
  assert.equal(a, signBookingToken("NK-2026-0142", SECRET));
  assert.equal(a.length, 32);
  assert.match(a, /^[A-Za-z0-9_-]+$/);
});

test("tokens verify only for the same ref and secret", () => {
  const tok = signBookingToken("NK-2026-0142", SECRET);
  assert.ok(verifyBookingToken("NK-2026-0142", tok, SECRET));
  assert.ok(!verifyBookingToken("NK-2026-0143", tok, SECRET));
  assert.ok(!verifyBookingToken("NK-2026-0142", tok, "other-secret"));
  assert.ok(!verifyBookingToken("NK-2026-0142", tok.slice(0, 31), SECRET));
  assert.ok(!verifyBookingToken("NK-2026-0142", undefined, SECRET));
  assert.ok(!verifyBookingToken("NK-2026-0142", "", SECRET));
});
