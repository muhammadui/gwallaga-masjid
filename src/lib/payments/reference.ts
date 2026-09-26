import { randomInt } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

/** Known reference prefixes: NK = nikah payment, DN = donation, BT = bank transfer. */
export type ReferencePrefix = "NK" | "DN" | "BT" | (string & {});

/**
 * Unique, human-readable payment reference, safe for Paystack and bank
 * narrations: `GJM-<PREFIX>-<timestamp base36>-<4 random>`, e.g.
 * `GJM-NK-MFZ3K2QX-7HQD`. Uppercase A–Z/0–9 and dashes only.
 */
export function makeReference(prefix: ReferencePrefix, now: Date = new Date()): string {
  const p = prefix.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!p) throw new Error("makeReference: prefix must contain A–Z or 0–9");
  const ts = now.getTime().toString(36).toUpperCase();
  let rand = "";
  for (let i = 0; i < 4; i++) rand += ALPHABET[randomInt(ALPHABET.length)];
  return `GJM-${p}-${ts}-${rand}`;
}

export const REFERENCE_PATTERN = /^GJM-[A-Z0-9]+-[0-9A-Z]+-[A-Z2-9]{4}$/;
