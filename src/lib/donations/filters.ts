import type { Prisma } from "@/lib/db";
import { DONATION_FREQUENCIES, DONATION_PROVIDERS, DONATION_PURPOSES, DONATION_STATUSES } from "./giving";

/**
 * Admin donation filters from URL search params, shared by the list page and
 * the CSV export so both always describe the same set.
 */

export interface DonationFilters {
  status?: (typeof DONATION_STATUSES)[number];
  purpose?: (typeof DONATION_PURPOSES)[number];
  provider?: (typeof DONATION_PROVIDERS)[number];
  frequency?: (typeof DONATION_FREQUENCIES)[number];
  from?: string; // YYYY-MM-DD (Africa/Lagos)
  to?: string;
  q?: string;
}

type Params = Record<string, string | string[] | undefined> | URLSearchParams;

function get(sp: Params, key: string): string | undefined {
  const v = sp instanceof URLSearchParams ? sp.get(key) : sp[key];
  const s = (Array.isArray(v) ? v[0] : v)?.trim();
  return s ? s : undefined;
}

function oneOf<T extends readonly string[]>(list: T, v: string | undefined): T[number] | undefined {
  return v && (list as readonly string[]).includes(v) ? (v as T[number]) : undefined;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseDonationFilters(sp: Params): DonationFilters {
  const from = get(sp, "from");
  const to = get(sp, "to");
  return {
    status: oneOf(DONATION_STATUSES, get(sp, "status")),
    purpose: oneOf(DONATION_PURPOSES, get(sp, "purpose")),
    provider: oneOf(DONATION_PROVIDERS, get(sp, "provider")),
    frequency: oneOf(DONATION_FREQUENCIES, get(sp, "frequency")),
    from: from && DATE.test(from) ? from : undefined,
    to: to && DATE.test(to) ? to : undefined,
    q: get(sp, "q")?.slice(0, 120),
  };
}

/** Lagos is UTC+1 all year: local midnight = 23:00 UTC the previous day. */
export function lagosDayStart(date: string): Date {
  return new Date(`${date}T00:00:00+01:00`);
}

export function donationWhere(f: DonationFilters): Prisma.DonationWhereInput {
  const where: Prisma.DonationWhereInput = {};
  if (f.status) where.status = f.status;
  if (f.purpose) where.purpose = f.purpose;
  if (f.provider) where.provider = f.provider;
  if (f.frequency) where.frequency = f.frequency;
  if (f.from || f.to) {
    where.createdAt = {
      ...(f.from ? { gte: lagosDayStart(f.from) } : {}),
      ...(f.to ? { lt: new Date(lagosDayStart(f.to).getTime() + 86_400_000) } : {}),
    };
  }
  if (f.q) {
    const contains = { contains: f.q, mode: "insensitive" as const };
    where.OR = [{ reference: contains }, { donorName: contains }, { donorEmail: contains }, { donorPhone: contains }];
  }
  return where;
}

/** Query string for the current filters (used by export + pagination links). */
export function filtersToQuery(f: DonationFilters, extra: Record<string, string> = {}): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v) p.set(k, v);
  for (const [k, v] of Object.entries(extra)) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : "";
}
