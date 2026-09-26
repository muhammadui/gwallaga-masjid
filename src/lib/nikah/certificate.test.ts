import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { generateNikahCertificate, type CertificateBooking } from "./certificate";
import { certificateNoForBookingRef, certificateSlug } from "./format";
import { hijriString } from "./hijri-string";

const booking: CertificateBooking = {
  groomName: "Abubakar Sadiq Muhammad",
  brideName: "Fatima Zahra Ɗanjuma",
  waliName: "Alhaji Ibrahim Ɗanjuma",
  waliRelationship: "Father",
  witness1Name: "Musa Garba Bello",
  witness2Name: "Yusuf Ahmad Tafawa",
  sadakiAmountKobo: 25_000_000,
  sadakiStatus: "DEFERRED",
  checklist: { sadakiPartly: true },
  scheduledAt: new Date("2026-10-03T09:00:00Z"),
  solemnizedAt: new Date("2026-10-03T09:20:00Z"),
};

test("certificate renders a valid, compact A4 PDF with an embedded QR image", async () => {
  const certificateNo = certificateNoForBookingRef("NK-2026-0142");
  const pdf = await generateNikahCertificate(booking, {
    certificateNo,
    issuedAt: new Date("2026-10-03T09:30:00Z"),
    officiantName: "Imam Muhammad Auwal",
    hijriDate: hijriString(new Date("2026-10-03T09:20:00Z")),
    verifyUrl: `https://gwallaga.example/verify/${certificateSlug(certificateNo)}`,
  });
  const head = Buffer.from(pdf.subarray(0, 5)).toString("latin1");
  assert.equal(head, "%PDF-");
  assert.ok(pdf.byteLength < 600 * 1024, `PDF is ${pdf.byteLength} bytes`);
  const text = Buffer.from(pdf).toString("latin1");
  assert.match(text, /\/Subtype\s*\/Image/, "QR image XObject present");
  assert.match(text, /\/MediaBox\s*\[\s*0 0 841\.89 595\.28\s*\]/, "A4 landscape");
  if (process.env.CERT_SAMPLE_OUT) await writeFile(process.env.CERT_SAMPLE_OUT, pdf);
});
