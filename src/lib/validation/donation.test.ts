import { test } from "node:test";
import assert from "node:assert/strict";
import { bankTransferDonationSchema, campaignSchema, bankAccountSchema, fieldErrors, onlineDonationSchema } from "./donation";

const valid = {
  purpose: "SADAQAH",
  frequency: "ONE_OFF",
  amountNaira: 5000,
  donorName: "Aisha Bello",
  donorEmail: "Aisha@Example.com ",
  anonymous: false,
  coverFees: true,
} as const;

test("online: accepts a normal gift and normalises email", () => {
  const r = onlineDonationSchema.parse(valid);
  assert.equal(r.donorEmail, "aisha@example.com");
  assert.equal(r.amountNaira, 5000);
  assert.equal(r.coverFees, true);
});

test("online: amount boundaries and string input", () => {
  assert.ok(onlineDonationSchema.safeParse({ ...valid, amountNaira: 100 }).success);
  assert.ok(!onlineDonationSchema.safeParse({ ...valid, amountNaira: 99 }).success);
  assert.ok(!onlineDonationSchema.safeParse({ ...valid, amountNaira: 0 }).success);
  assert.ok(!onlineDonationSchema.safeParse({ ...valid, amountNaira: -500 }).success);
  assert.ok(!onlineDonationSchema.safeParse({ ...valid, amountNaira: 150.5 }).success);
  assert.ok(!onlineDonationSchema.safeParse({ ...valid, amountNaira: 50_000_001 }).success);
  assert.equal(onlineDonationSchema.parse({ ...valid, amountNaira: "₦20,000" }).amountNaira, 20000);
  assert.ok(!onlineDonationSchema.safeParse({ ...valid, amountNaira: "" }).success);
  assert.ok(!onlineDonationSchema.safeParse({ ...valid, amountNaira: "12.50" }).success);
  assert.ok(!onlineDonationSchema.safeParse({ ...valid, amountNaira: "abc" }).success);
});

test("online: email required; bank transfer: optional", () => {
  const noEmail = { ...valid, donorEmail: "" };
  const r = onlineDonationSchema.safeParse(noEmail);
  assert.ok(!r.success);
  assert.ok("donorEmail" in fieldErrors(r.error));
  assert.ok(bankTransferDonationSchema.safeParse(noEmail).success);
  assert.ok(!onlineDonationSchema.safeParse({ ...valid, donorEmail: "not-an-email" }).success);
});

test("name required unless anonymous", () => {
  assert.ok(!onlineDonationSchema.safeParse({ ...valid, donorName: " " }).success);
  assert.ok(onlineDonationSchema.safeParse({ ...valid, donorName: "", anonymous: true }).success);
});

test("campaign purpose requires a slug", () => {
  const r = onlineDonationSchema.safeParse({ ...valid, purpose: "CAMPAIGN" });
  assert.ok(!r.success);
  assert.equal(Object.keys(fieldErrors(r.error))[0], "campaignSlug");
  assert.ok(onlineDonationSchema.safeParse({ ...valid, purpose: "CAMPAIGN", campaignSlug: "masjid-upkeep" }).success);
  assert.ok(!onlineDonationSchema.safeParse({ ...valid, purpose: "WAQF" }).success);
});

test("phone validation", () => {
  assert.ok(onlineDonationSchema.safeParse({ ...valid, donorPhone: "+234 803 123 4567" }).success);
  assert.ok(onlineDonationSchema.safeParse({ ...valid, donorPhone: "08031234567" }).success);
  assert.ok(!onlineDonationSchema.safeParse({ ...valid, donorPhone: "call me" }).success);
});

test("bank transfer forces one-off and no fee cover", () => {
  const r = bankTransferDonationSchema.parse({ ...valid, frequency: "MONTHLY", coverFees: true });
  assert.equal(r.frequency, "ONE_OFF");
  assert.equal(r.coverFees, false);
});

test("admin campaign + bank account schemas", () => {
  const c = campaignSchema.parse({ title: "Roof repair", description: "Fixing the roof before rains.", targetNaira: "500000", active: "on", slug: "" });
  assert.equal(c.slug, undefined);
  assert.equal(c.active, true);
  assert.equal(c.targetNaira, 500000);
  assert.ok(!campaignSchema.safeParse({ title: "Roof", description: "Fixing the roof.", targetNaira: "500", slug: "" }).success);
  assert.ok(!campaignSchema.safeParse({ title: "Roof", description: "Fixing the roof.", targetNaira: "5000", slug: "Bad Slug" }).success);
  const b = bankAccountSchema.parse({ bankName: "Jaiz Bank", accountName: "Gwallaga Masjid", accountNumber: "0123 456 789" });
  assert.equal(b.accountNumber, "0123456789");
  assert.equal(b.active, false);
  assert.ok(!bankAccountSchema.safeParse({ bankName: "Jaiz", accountName: "GM", accountNumber: "12345" }).success);
});
