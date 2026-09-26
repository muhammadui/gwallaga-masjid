import crypto from "node:crypto";

/**
 * Verify Paystack's `x-paystack-signature` header: hex HMAC-SHA512 of the RAW
 * request body keyed with the secret key. Constant-time compare. Pass the
 * exact bytes received, never a re-stringified object.
 */
export function verifyPaystackSignature(
  rawBody: string | Buffer,
  signature: string | null | undefined,
  secret: string | undefined = process.env.PAYSTACK_SECRET_KEY,
): boolean {
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(signature.trim(), "hex");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Test helper / tooling: produce the signature Paystack would send. */
export function signPaystackBody(rawBody: string | Buffer, secret: string): string {
  return crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
}
