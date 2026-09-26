/**
 * Pure giving helpers shared by the donate form (client), server actions and
 * tests. No database or server-only imports here.
 */

export const DONATION_PURPOSES = ["SADAQAH", "ZAKAT", "UPKEEP", "IFTAR", "ORPHANS", "CAMPAIGN"] as const;
export type DonationPurposeValue = (typeof DONATION_PURPOSES)[number];

/** The five tabs on /donate (CAMPAIGN is selected via ?campaign=slug). */
export const PURPOSE_TABS = ["SADAQAH", "ZAKAT", "UPKEEP", "IFTAR", "ORPHANS"] as const satisfies readonly DonationPurposeValue[];

export const DONATION_FREQUENCIES = ["ONE_OFF", "MONTHLY"] as const;
export type DonationFrequencyValue = (typeof DONATION_FREQUENCIES)[number];

export const DONATION_STATUSES = ["INITIATED", "SUCCESS", "FAILED", "PENDING_TRANSFER"] as const;
export const DONATION_PROVIDERS = ["PAYSTACK", "SERVICEFABRIC", "BANK_TRANSFER"] as const;

/** Preset amounts in naira. */
export const AMOUNT_PRESETS_NAIRA = [1_000, 5_000, 20_000, 100_000] as const;
export const DEFAULT_AMOUNT_NAIRA = 5_000;

export const MIN_DONATION_NAIRA = 100;
export const MAX_DONATION_NAIRA = 50_000_000;

/** Map a loose `?purpose=` value (e.g. "zakat", "upkeep", "orphans-welfare") to a tab. */
export function parsePurposeParam(value: string | string[] | undefined): (typeof PURPOSE_TABS)[number] | null {
  const raw = (Array.isArray(value) ? value[0] : value)?.trim().toLowerCase();
  if (!raw) return null;
  const aliases: Record<string, (typeof PURPOSE_TABS)[number]> = {
    sadaqah: "SADAQAH",
    sadaqa: "SADAQAH",
    sadaka: "SADAQAH",
    zakat: "ZAKAT",
    zakah: "ZAKAT",
    upkeep: "UPKEEP",
    "masjid-upkeep": "UPKEEP",
    iftar: "IFTAR",
    "ramadan-iftar": "IFTAR",
    orphans: "ORPHANS",
    "orphans-welfare": "ORPHANS",
  };
  return aliases[raw] ?? null;
}

/**
 * "That's about ₦X a day" reframing for a monthly gift: the yearly total
 * spread over 365 days, rounded to the nearest whole naira (never below ₦1).
 * Returns kobo.
 */
export function perDayKobo(monthlyKobo: number): number {
  if (!Number.isFinite(monthlyKobo) || monthlyKobo <= 0) return 0;
  const naira = Math.round((monthlyKobo * 12) / 365 / 100);
  return Math.max(1, naira) * 100;
}

/** Whole naira → kobo. */
export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

/** Parse a user-typed naira amount ("5,000", "₦ 20000") to an integer, or null. */
export function parseNairaInput(value: string): number | null {
  const cleaned = value.replace(/[₦,\s]/g, "");
  if (!/^\d+$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isSafeInteger(n) ? n : null;
}

/** URL slug from a title: "Ramadan Iftar 1448!" → "ramadan-iftar-1448". */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[ɓƁ]/g, "b")
    .replace(/[ɗƊ]/g, "d")
    .replace(/[ƙƘ]/g, "k")
    .replace(/[ƴƳ]/g, "y")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/** Percent of target reached, clamped 0–100, integer. */
export function progressPercent(raisedKobo: number, targetKobo: number): number {
  if (targetKobo <= 0) return 0;
  return Math.max(0, Math.min(100, Math.floor((raisedKobo / targetKobo) * 100)));
}

/** First name for greetings; empty when not usable. */
export function firstName(name: string | null | undefined): string {
  return (name ?? "").trim().split(/\s+/)[0] ?? "";
}
