import { test } from "node:test";
import assert from "node:assert/strict";
import {
  certificateNoForBookingRef,
  certificateSlug,
  formatBookingRef,
  formatCertificateNo,
  normalizeBookingRef,
  normalizeCertificateNo,
  parseBookingRef,
} from "./format";

test("booking refs are NK-<year>-<4-digit seq>", () => {
  assert.equal(formatBookingRef(2026, 142), "NK-2026-0142");
  assert.equal(formatBookingRef(2026, 12345), "NK-2026-12345");
  assert.deepEqual(parseBookingRef("nk-2026-0142"), { year: 2026, seq: 142 });
  assert.equal(normalizeBookingRef(" nk-2026-142 "), "NK-2026-0142");
  assert.equal(normalizeBookingRef("GJM-NK-1"), null);
  assert.throws(() => formatBookingRef(2026, 0));
});

test("certificate numbers are GJM/NK/<year>/<seq> from the booking sequence", () => {
  assert.equal(formatCertificateNo(2026, 1), "GJM/NK/2026/0001");
  assert.equal(certificateNoForBookingRef("NK-2026-0142"), "GJM/NK/2026/0142");
  assert.throws(() => certificateNoForBookingRef("bad"));
});

test("certificate numbers normalise from encoded, dashed and lowercase forms", () => {
  assert.equal(certificateSlug("GJM/NK/2026/0001"), "GJM-NK-2026-0001");
  assert.equal(normalizeCertificateNo("GJM%2FNK%2F2026%2F0001"), "GJM/NK/2026/0001");
  assert.equal(normalizeCertificateNo("gjm-nk-2026-0001"), "GJM/NK/2026/0001");
  assert.equal(normalizeCertificateNo("GJM/NK/2026/0001"), "GJM/NK/2026/0001");
  assert.equal(normalizeCertificateNo("GJM/NK/2026"), null);
  assert.equal(normalizeCertificateNo("%E0%A4%A"), null);
});
