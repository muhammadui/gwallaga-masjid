import "server-only";
import { prisma, type Prisma } from "@/lib/db";
import { lagosDateTime, weekdayOfYmd } from "./time";

export interface SlotOption {
  slotId: string;
  time: string;
  label: string;
  available: boolean;
}

type Db = Prisma.TransactionClient | typeof prisma;

/** Bookings that hold their datetime: paid/confirmed/solemnized, or pending and not yet expired. */
export function holdingWhere(now: Date = new Date()): Prisma.NikahBookingWhereInput {
  return {
    OR: [
      { status: { in: ["PAID", "CONFIRMED", "SOLEMNIZED"] } },
      { status: "PENDING_PAYMENT", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    ],
  };
}

/** How many bookings hold each of the given instants. */
export async function holdCounts(instants: Date[], opts: { excludeBookingId?: string; db?: Db } = {}): Promise<Map<number, number>> {
  const db = opts.db ?? prisma;
  if (instants.length === 0) return new Map();
  const rows = await db.nikahBooking.groupBy({
    by: ["scheduledAt"],
    where: {
      scheduledAt: { in: instants },
      ...(opts.excludeBookingId ? { id: { not: opts.excludeBookingId } } : {}),
      ...holdingWhere(),
    },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.scheduledAt.getTime(), r._count._all]));
}

/** Active weekly slots for a Lagos date, each marked available or taken. */
export async function slotsForDate(ymd: string, opts: { excludeBookingId?: string; db?: Db } = {}): Promise<SlotOption[]> {
  const db = opts.db ?? prisma;
  const weekday = weekdayOfYmd(ymd);
  const slots = await db.nikahSlot.findMany({ where: { weekday, active: true }, orderBy: { time: "asc" } });
  const instants = slots.map((s) => lagosDateTime(ymd, s.time));
  const counts = await holdCounts(instants, opts);
  const now = Date.now();
  return slots.map((s, i) => ({
    slotId: s.id,
    time: s.time,
    label: s.time,
    available: instants[i].getTime() > now && (counts.get(instants[i].getTime()) ?? 0) < s.capacity,
  }));
}

/** Weekdays (0–6) that have at least one active slot. */
export async function activeWeekdays(): Promise<number[]> {
  const rows = await prisma.nikahSlot.findMany({ where: { active: true }, select: { weekday: true }, distinct: ["weekday"] });
  return rows.map((r) => r.weekday).sort();
}

/**
 * Whether `at` can take one more booking. Capacity comes from the matching
 * weekly slot when there is one, otherwise 1 (admin-proposed ad-hoc times).
 */
export async function isInstantFree(at: Date, capacity: number, opts: { excludeBookingId?: string; db?: Db } = {}): Promise<boolean> {
  const counts = await holdCounts([at], opts);
  return (counts.get(at.getTime()) ?? 0) < capacity;
}
