import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Unguessable access token for a booking's public pages: HMAC-SHA256 of the
 * booking reference keyed with BETTER_AUTH_SECRET, base64url, 32 chars.
 * Status/pay links carry it as `?t=`.
 */
function secretOrThrow(secret?: string): string {
  const s = secret ?? process.env.BETTER_AUTH_SECRET;
  if (!s) throw new Error("BETTER_AUTH_SECRET is not set");
  return s;
}

export function signBookingToken(bookingRef: string, secret?: string): string {
  return createHmac("sha256", secretOrThrow(secret))
    .update(`nikah:${bookingRef}`)
    .digest("base64url")
    .slice(0, 32);
}

export function verifyBookingToken(bookingRef: string, token: string | null | undefined, secret?: string): boolean {
  if (!token || typeof token !== "string") return false;
  const expected = Buffer.from(signBookingToken(bookingRef, secret));
  const given = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Relative status-page path with its token. */
export function statusPath(bookingRef: string): string {
  return `/nikah/${bookingRef}?t=${signBookingToken(bookingRef)}`;
}

/** Relative pay-page path with its token. */
export function payPath(bookingRef: string): string {
  return `/nikah/pay/${bookingRef}?t=${signBookingToken(bookingRef)}`;
}
