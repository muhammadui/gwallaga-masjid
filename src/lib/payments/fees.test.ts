import { test } from "node:test";
import assert from "node:assert/strict";
import {
  paystackFeeKobo,
  grossUpForFees,
  netAfterFeesKobo,
  feesToCoverKobo,
  PAYSTACK_FEE_CAP_KOBO,
} from "./fees";

const N = (naira: number) => Math.round(naira * 100);

test("fee: 1.5% only, flat waived at and below ₦2,500", () => {
  assert.equal(paystackFeeKobo(N(1000)), N(15));
  assert.equal(paystackFeeKobo(N(2500)), N(37.5));
});

test("fee: flat ₦100 applies just above ₦2,500", () => {
  assert.equal(paystackFeeKobo(N(2500) + 1), Math.ceil((N(2500) + 1) * 0.015) + N(100));
  assert.equal(paystackFeeKobo(N(5000)), N(175));
  assert.equal(paystackFeeKobo(N(15000)), N(325));
});

test("fee: capped at ₦2,000", () => {
  assert.equal(paystackFeeKobo(N(126_667)), N(2000));
  assert.equal(paystackFeeKobo(N(1_000_000)), PAYSTACK_FEE_CAP_KOBO);
  // just below the cap: 1.5% × 126,000 + 100 = 1,990
  assert.equal(paystackFeeKobo(N(126_000)), N(1990));
});

test("fee: zero and invalid input", () => {
  assert.equal(paystackFeeKobo(0), 0);
  assert.throws(() => paystackFeeKobo(-1));
  assert.throws(() => paystackFeeKobo(10.5));
});

test("grossUp: masjid nets at least the intended amount, minimally", () => {
  for (const net of [1, 99, N(100), N(1000), N(2400), N(2462), N(2463), N(2500), N(5000), N(15000), N(20000), N(100000), N(124000), N(125000), N(1_000_000), 123_457]) {
    const gross = grossUpForFees(net);
    assert.ok(netAfterFeesKobo(gross) >= net, `nets ≥ ${net}`);
    assert.ok(netAfterFeesKobo(gross - 1) < net || gross === 0, `minimal for ${net}`);
  }
});

test("grossUp: small gift stays in the waived region", () => {
  // ₦1,000 → charge ₦1,015.23 (1.5% of 101,523 = 1,522.85 → 1,523)
  assert.equal(grossUpForFees(N(1000)), 101_523);
  assert.ok(grossUpForFees(N(2400)) <= N(2500));
});

test("grossUp: crossing the ₦2,500 boundary adds the flat fee", () => {
  // net ₦2,463 cannot be reached at ≤ ₦2,500 (max net there is ₦2,462.50)
  const g = grossUpForFees(N(2463));
  assert.ok(g > N(2500));
  assert.equal(paystackFeeKobo(g), Math.ceil(g * 0.015) + N(100));
});

test("grossUp: large gifts pay exactly the ₦2,000 cap", () => {
  assert.equal(grossUpForFees(N(1_000_000)), N(1_002_000));
  assert.equal(feesToCoverKobo(N(500_000)), N(2000));
});

test("grossUp: very large gifts resolve instantly and exactly", () => {
  const net = N(50_000_000);
  const started = Date.now();
  assert.equal(grossUpForFees(net), net + PAYSTACK_FEE_CAP_KOBO);
  assert.ok(Date.now() - started < 50);
});

test("grossUp: around the cap boundary", () => {
  for (let net = N(124_600); net <= N(124_700); net += 7) {
    const g = grossUpForFees(net);
    assert.ok(netAfterFeesKobo(g) >= net && netAfterFeesKobo(g - 1) < net);
  }
});

test("grossUp: zero", () => {
  assert.equal(grossUpForFees(0), 0);
});
