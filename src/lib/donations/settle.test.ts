import { test } from "node:test";
import assert from "node:assert/strict";
import type { VerifyResult } from "@/lib/payments/provider";
import type { SettleData } from "@/lib/payments/webhook";
import { settleDonation, type DonationSettleRepo } from "./settle";

/** In-memory repo with the Prisma repo's conditional-update semantics. */
function memoryRepo() {
  const donations = new Map<string, { amountKobo: number; feesCoveredKobo: number; status: string; campaignId: string | null; paidAt?: Date }>();
  const campaigns = new Map<string, { raisedKobo: number }>();
  const calls = { settle: 0 };
  const repo: DonationSettleRepo = {
    async findDonation(ref) {
      const d = donations.get(ref);
      return d ? { expectedKobo: d.amountKobo + d.feesCoveredKobo } : null;
    },
    async settleDonation(ref, data: SettleData) {
      calls.settle++;
      const d = donations.get(ref);
      if (!d) return "not_found";
      if (d.status === "SUCCESS") return "duplicate";
      d.status = "SUCCESS";
      d.paidAt = data.paidAt;
      if (d.campaignId) campaigns.get(d.campaignId)!.raisedKobo += d.amountKobo;
      return "settled";
    },
    async failDonation(ref) {
      const d = donations.get(ref);
      if (d && d.status !== "SUCCESS") d.status = "FAILED";
    },
  };
  return { repo, donations, campaigns, calls };
}

const ok = (amountKobo: number): VerifyResult => ({ status: "success", amountKobo, channel: "card", paidAt: new Date("2026-09-26T09:00:00Z"), raw: {} });

test("settles once and increments the campaign once, however many times it is called", async () => {
  const m = memoryRepo();
  m.campaigns.set("c1", { raisedKobo: 0 });
  m.donations.set("GJM-DN-1-AAAA", { amountKobo: 500_000, feesCoveredKobo: 8_700, status: "INITIATED", campaignId: "c1" });

  assert.equal(await settleDonation("GJM-DN-1-AAAA", ok(508_700), m.repo), "settled");
  assert.equal(await settleDonation("GJM-DN-1-AAAA", ok(508_700), m.repo), "duplicate");
  assert.equal(await settleDonation("GJM-DN-1-AAAA", ok(508_700), m.repo), "duplicate");
  assert.equal(m.donations.get("GJM-DN-1-AAAA")!.status, "SUCCESS");
  assert.equal(m.campaigns.get("c1")!.raisedKobo, 500_000); // net, not the charge
});

test("concurrent callback + webhook style calls still settle exactly once", async () => {
  const m = memoryRepo();
  m.campaigns.set("c1", { raisedKobo: 100 });
  m.donations.set("R", { amountKobo: 1_000, feesCoveredKobo: 0, status: "INITIATED", campaignId: "c1" });
  const results = await Promise.all([settleDonation("R", ok(1_000), m.repo), settleDonation("R", ok(1_000), m.repo)]);
  assert.deepEqual(results.sort(), ["duplicate", "settled"]);
  assert.equal(m.campaigns.get("c1")!.raisedKobo, 1_100);
});

test("under-payment fails the donation and never touches the campaign", async () => {
  const m = memoryRepo();
  m.campaigns.set("c1", { raisedKobo: 0 });
  m.donations.set("R", { amountKobo: 500_000, feesCoveredKobo: 8_700, status: "INITIATED", campaignId: "c1" });
  assert.equal(await settleDonation("R", ok(500_000), m.repo), "amount_mismatch");
  assert.equal(m.donations.get("R")!.status, "FAILED");
  assert.equal(m.campaigns.get("c1")!.raisedKobo, 0);
});

test("pending changes nothing; failed marks FAILED but never downgrades SUCCESS", async () => {
  const m = memoryRepo();
  m.donations.set("P", { amountKobo: 1_000, feesCoveredKobo: 0, status: "INITIATED", campaignId: null });
  assert.equal(await settleDonation("P", { status: "pending", amountKobo: 1_000, raw: {} }, m.repo), "pending");
  assert.equal(m.donations.get("P")!.status, "INITIATED");
  assert.equal(m.calls.settle, 0);

  assert.equal(await settleDonation("P", { status: "failed", amountKobo: 0, raw: {} }, m.repo), "failed");
  assert.equal(m.donations.get("P")!.status, "FAILED");

  // A later successful verification (retry on the same reference) still settles.
  assert.equal(await settleDonation("P", ok(1_000), m.repo), "settled");
  assert.equal(await settleDonation("P", { status: "failed", amountKobo: 0, raw: {} }, m.repo), "failed");
  assert.equal(m.donations.get("P")!.status, "SUCCESS");
});

test("unknown reference", async () => {
  const m = memoryRepo();
  assert.equal(await settleDonation("NOPE", ok(1_000), m.repo), "not_found");
});
