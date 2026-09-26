/**
 * Booking references and certificate numbers.
 *
 *   bookingRef     NK-2026-0142        (per-year sequence)
 *   certificateNo  GJM/NK/2026/0142    (same year + sequence as the booking)
 *   URL-safe form  GJM-NK-2026-0142    (used in QR codes and links)
 */

export const BOOKING_REF_PATTERN = /^NK-(\d{4})-(\d{1,6})$/;
export const CERTIFICATE_NO_PATTERN = /^GJM\/NK\/(\d{4})\/(\d{4,})$/;

function pad(seq: number): string {
  if (!Number.isInteger(seq) || seq < 1) throw new Error(`Invalid sequence: ${seq}`);
  return String(seq).padStart(4, "0");
}

export function formatBookingRef(year: number, seq: number): string {
  return `NK-${year}-${pad(seq)}`;
}

export function parseBookingRef(ref: string): { year: number; seq: number } | null {
  const m = BOOKING_REF_PATTERN.exec(ref.trim().toUpperCase());
  return m ? { year: Number(m[1]), seq: Number(m[2]) } : null;
}

/** Normalise user input ("nk-2026-142 ") to a canonical booking ref, or null. */
export function normalizeBookingRef(input: string): string | null {
  const p = parseBookingRef(input.replace(/\s+/g, ""));
  return p ? formatBookingRef(p.year, p.seq) : null;
}

export function formatCertificateNo(year: number, seq: number): string {
  return `GJM/NK/${year}/${pad(seq)}`;
}

/** GJM/NK/<year>/<seq> derived from the booking's own sequence. */
export function certificateNoForBookingRef(bookingRef: string): string {
  const p = parseBookingRef(bookingRef);
  if (!p) throw new Error(`Invalid booking reference: ${bookingRef}`);
  return formatCertificateNo(p.year, p.seq);
}

/** URL-safe variant with dashes: GJM-NK-2026-0142. */
export function certificateSlug(certificateNo: string): string {
  return certificateNo.replace(/\//g, "-");
}

/**
 * Accepts the canonical number, its URL-encoded form (GJM%2FNK%2F2026%2F0001)
 * or the dashed slug, in any case, and returns the canonical number or null.
 */
export function normalizeCertificateNo(input: string): string | null {
  let s = input;
  try {
    s = decodeURIComponent(input);
  } catch {
    // keep raw input
  }
  s = s.trim().toUpperCase().replace(/[-\s]+/g, "/");
  const m = CERTIFICATE_NO_PATTERN.exec(s);
  return m ? formatCertificateNo(Number(m[1]), Number(m[2])) : null;
}

/** Fill "{name}" placeholders in a dictionary string. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));
}
