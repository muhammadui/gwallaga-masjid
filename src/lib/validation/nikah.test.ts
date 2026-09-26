import { test } from "node:test";
import assert from "node:assert/strict";
import { displayPhone, isNigerianPhone, nikahBookingSchema, normalizePhone } from "./nikah";

test("Nigerian phone numbers validate and normalise to +234", () => {
  for (const p of ["0803 123 4567", "08031234567", "+2348031234567", "234-803-123-4567", "0701 234 5678"]) assert.ok(isNigerianPhone(p), p);
  for (const p of ["0803123456", "12345678901", "+447911123456", ""]) assert.ok(!isNigerianPhone(p), p);
  assert.equal(normalizePhone("0803 123 4567"), "+2348031234567");
  assert.equal(normalizePhone("234 803 123 4567"), "+2348031234567");
  assert.equal(displayPhone("+2348031234567"), "0803 123 4567");
});

const valid = {
  date: "2026-10-03", time: "10:00", slotId: "slot1",
  groomName: "Abubakar Sadiq", groomPhone: "08031234567", groomEmail: "groom@example.com", groomAddress: "12 Yandoka Road, Bauchi", groomAge: 29,
  brideName: "Fatima Zahra", bridePhone: "08061234567", brideEmail: "", brideAddress: "4 Gwallaga Street, Bauchi", brideAge: 24,
  waliName: "Ibrahim Danjuma", waliRelationship: "FATHER", waliRelationshipOther: "", waliPhone: "08091234567",
  witness1Name: "Musa Garba", witness1Phone: "08021234567", witness2Name: "Yusuf Ahmad", witness2Phone: "08011234567",
  sadakiAmount: 250000, sadakiStatus: "DEFERRED", notes: "", consent: true,
};

test("booking schema accepts a complete booking and enforces rules", () => {
  assert.ok(nikahBookingSchema.safeParse(valid).success);
  assert.ok(!nikahBookingSchema.safeParse({ ...valid, brideAge: 17 }).success);
  assert.ok(!nikahBookingSchema.safeParse({ ...valid, consent: false }).success);
  assert.ok(!nikahBookingSchema.safeParse({ ...valid, waliRelationship: "OTHER" }).success);
  assert.ok(nikahBookingSchema.safeParse({ ...valid, waliRelationship: "OTHER", waliRelationshipOther: "Cousin" }).success);
  const same = nikahBookingSchema.safeParse({ ...valid, witness2Phone: "+2348021234567" });
  assert.ok(!same.success && same.error.issues.some((i) => i.path[0] === "witness2Phone"));
});
