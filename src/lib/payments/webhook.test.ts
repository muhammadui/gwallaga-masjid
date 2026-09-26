import { test } from "node:test";
import assert from "node:assert/strict";
import { signPaystackBody, verifyPaystackSignature } from "./signature";
import { handlePaystackEvent, type SettleData, type WebhookRepo } from "./webhook";

const SECRET = "sk_test_signature_secret";

test("signature: accepts the exact body, rejects tampering and wrong secret", () => {
  const body = JSON.stringify({ event: "charge.success", data: { reference: "GJM-DN-1-ABCD", amount: 100000 } });
  const sig = signPaystackBody(body, SECRET);
  assert.equal(sig.length, 128); // sha512 hex
  assert.ok(verifyPaystackSignature(body, sig, SECRET));
  assert.ok(!verifyPaystackSignature(body + " ", sig, SECRET));
  assert.ok(!verifyPaystackSignature(body, sig, "sk_test_other"));
  assert.ok(!verifyPaystackSignature(body, null, SECRET));
  assert.ok(!verifyPaystackSignature(body, "not-hex", SECRET));
  assert.ok(!verifyPaystackSignature(body, sig, undefined));
});

/** In-memory repo mirroring the Prisma repo's conditional-update semantics. */
function memoryRepo() {
  const payments = new Map<string, { bookingId: string; amountKobo: number; status: string; paidAt?: Date }>();
  const bookings = new Map<string, { status: string }>();
  const donations = new Map<
    string,
    { id: string; amountKobo: number; feesCoveredKobo: number; status: string; campaignId: string | null; planCode?: string; email?: string; subscriptionCode?: string; active?: boolean }
  >();
  const campaigns = new Map<string, { raisedKobo: number }>();

  const repo: WebhookRepo = {
    async findNikahPayment(ref) {
      const p = payments.get(ref);
      return p ? { expectedKobo: p.amountKobo } : null;
    },
    async settleNikah(ref, data: SettleData) {
      const p = payments.get(ref);
      if (!p) return "not_found";
      if (p.status === "SUCCESS") return "duplicate";
      p.status = "SUCCESS";
      p.paidAt = data.paidAt;
      const b = bookings.get(p.bookingId)!;
      if (b.status === "PENDING_PAYMENT" || b.status === "EXPIRED") b.status = "PAID";
      return "settled";
    },
    async failNikah(ref) {
      const p = payments.get(ref);
      if (p && p.status !== "SUCCESS") p.status = "FAILED";
    },
    async findDonation(ref) {
      const d = donations.get(ref);
      return d ? { expectedKobo: d.amountKobo + d.feesCoveredKobo } : null;
    },
    async settleDonation(ref) {
      const d = donations.get(ref);
      if (!d) return "not_found";
      if (d.status === "SUCCESS") return "duplicate";
      d.status = "SUCCESS";
      if (d.campaignId) campaigns.get(d.campaignId)!.raisedKobo += d.amountKobo;
      return "settled";
    },
    async failDonation(ref) {
      const d = donations.get(ref);
      if (d && d.status !== "SUCCESS") d.status = "FAILED";
    },
    async findRecurringParent(planCode, email) {
      const d = [...donations.values()].find((x) => x.planCode === planCode && x.email === email);
      return d ? { id: d.id, amountKobo: d.amountKobo, feesCoveredKobo: d.feesCoveredKobo } : null;
    },
    async createRecurringDonation(parentId, ref) {
      if (donations.has(ref)) return "duplicate";
      const parent = [...donations.values()].find((x) => x.id === parentId)!;
      donations.set(ref, { ...parent, id: `child-${ref}`, status: "SUCCESS" });
      if (parent.campaignId) campaigns.get(parent.campaignId)!.raisedKobo += parent.amountKobo;
      return "settled";
    },
    async attachSubscription({ planCode, email, subscriptionCode }) {
      const d = [...donations.values()].find((x) => x.planCode === planCode && x.email === email);
      if (!d) return false;
      d.subscriptionCode = subscriptionCode;
      d.active = true;
      return true;
    },
    async setSubscriptionActive(code, active) {
      let n = 0;
      for (const d of donations.values()) {
        if (d.subscriptionCode === code) {
          d.active = active;
          n++;
        }
      }
      return n;
    },
  };
  return { repo, payments, bookings, donations, campaigns };
}

const charge = (reference: string, amount: number, metadata: unknown, extra: Record<string, unknown> = {}) => ({
  event: "charge.success" as const,
  data: { reference, amount, channel: "card", paid_at: "2026-09-26T10:00:00.000Z", metadata, ...extra },
});

test("nikah charge.success settles once; replays are no-ops", async () => {
  const m = memoryRepo();
  m.bookings.set("b1", { status: "PENDING_PAYMENT" });
  m.payments.set("GJM-NK-1-AAAA", { bookingId: "b1", amountKobo: 1_500_000, status: "INITIATED" });

  const ev = charge("GJM-NK-1-AAAA", 1_500_000, { kind: "nikah", id: "b1" });
  assert.equal((await handlePaystackEvent(ev, m.repo)).outcome, "nikah:settled");
  assert.equal((await handlePaystackEvent(ev, m.repo)).outcome, "nikah:duplicate");
  assert.equal(m.bookings.get("b1")!.status, "PAID");
  assert.equal(m.payments.get("GJM-NK-1-AAAA")!.status, "SUCCESS");
});

test("nikah underpayment is rejected, not settled", async () => {
  const m = memoryRepo();
  m.bookings.set("b2", { status: "PENDING_PAYMENT" });
  m.payments.set("GJM-NK-2-BBBB", { bookingId: "b2", amountKobo: 1_500_000, status: "INITIATED" });
  const r = await handlePaystackEvent(charge("GJM-NK-2-BBBB", 100, { kind: "nikah" }), m.repo);
  assert.equal(r.outcome, "nikah:amount_mismatch");
  assert.equal(m.bookings.get("b2")!.status, "PENDING_PAYMENT");
});

test("donation settles once and increments campaign exactly once (metadata as JSON string too)", async () => {
  const m = memoryRepo();
  m.campaigns.set("c1", { raisedKobo: 0 });
  m.donations.set("GJM-DN-1-CCCC", { id: "d1", amountKobo: 500_000, feesCoveredKobo: 17_500, status: "INITIATED", campaignId: "c1" });
  const ev = charge("GJM-DN-1-CCCC", 517_500, JSON.stringify({ kind: "donation", id: "d1" }));
  for (let i = 0; i < 3; i++) await handlePaystackEvent(ev, m.repo);
  assert.equal(m.campaigns.get("c1")!.raisedKobo, 500_000);
  assert.equal(m.donations.get("GJM-DN-1-CCCC")!.status, "SUCCESS");
});

test("subscription.create attaches code; renewal charge creates one child donation", async () => {
  const m = memoryRepo();
  m.campaigns.set("c2", { raisedKobo: 0 });
  m.donations.set("GJM-DN-2-DDDD", {
    id: "d2", amountKobo: 100_000, feesCoveredKobo: 0, status: "SUCCESS", campaignId: "c2", planCode: "PLN_x", email: "a@b.co",
  });
  const sub = { event: "subscription.create", data: { subscription_code: "SUB_1", plan: { plan_code: "PLN_x" }, customer: { email: "a@b.co" } } };
  assert.equal((await handlePaystackEvent(sub, m.repo)).outcome, "subscription:attached");
  assert.equal(m.donations.get("GJM-DN-2-DDDD")!.subscriptionCode, "SUB_1");

  const renewal = charge("T_renewal_1", 100_000, {}, { plan: { plan_code: "PLN_x" }, customer: { email: "a@b.co" } });
  assert.equal((await handlePaystackEvent(renewal, m.repo)).outcome, "donation:renewal_settled");
  assert.equal((await handlePaystackEvent(renewal, m.repo)).outcome, "donation:duplicate");
  assert.equal(m.campaigns.get("c2")!.raisedKobo, 100_000);

  const off = { event: "subscription.disable", data: { subscription_code: "SUB_1" } };
  assert.equal((await handlePaystackEvent(off, m.repo)).outcome, "subscription:disabled(2)");
});

test("unknown events and references are acknowledged, not thrown", async () => {
  const m = memoryRepo();
  assert.equal((await handlePaystackEvent({ event: "transfer.success", data: {} }, m.repo)).outcome, "ignored:unhandled_event");
  assert.equal((await handlePaystackEvent(charge("nope", 1, null), m.repo)).outcome, "ignored:unknown_reference");
});
