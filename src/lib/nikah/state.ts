/**
 * Nikah booking state machine. Every status change in the app goes through
 * `assertTransition` so the rules live in one table.
 *
 *   PENDING_PAYMENT ─pay─▶ PAID ─confirm─▶ CONFIRMED ─solemnize─▶ SOLEMNIZED
 *        │  └─48h─▶ EXPIRED ─late payment─▶ PAID
 *        └──────────── any open state ─cancel─▶ CANCELLED
 */
export type NikahStatusValue = "PENDING_PAYMENT" | "PAID" | "CONFIRMED" | "SOLEMNIZED" | "CANCELLED" | "EXPIRED";

export const TRANSITIONS: Readonly<Record<NikahStatusValue, readonly NikahStatusValue[]>> = {
  PENDING_PAYMENT: ["PAID", "EXPIRED", "CANCELLED"],
  EXPIRED: ["PAID", "CANCELLED"],
  PAID: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["SOLEMNIZED", "CANCELLED"],
  SOLEMNIZED: [],
  CANCELLED: [],
};

export function canTransition(from: NikahStatusValue, to: NikahStatusValue): boolean {
  return TRANSITIONS[from].includes(to);
}

export class TransitionError extends Error {
  constructor(
    readonly from: NikahStatusValue,
    readonly to: NikahStatusValue,
  ) {
    super(`Illegal nikah transition ${from} → ${to}`);
    this.name = "TransitionError";
  }
}

export function assertTransition(from: NikahStatusValue, to: NikahStatusValue): void {
  if (!canTransition(from, to)) throw new TransitionError(from, to);
}

/** States whose datetime is held against new bookings (pending ones only until expiresAt). */
export const SLOT_HOLDING_STATUSES: readonly NikahStatusValue[] = ["PENDING_PAYMENT", "PAID", "CONFIRMED", "SOLEMNIZED"];

/** A booking can be moved to another slot while it has not happened or ended. */
export function canReschedule(status: NikahStatusValue): boolean {
  return status === "PENDING_PAYMENT" || status === "PAID" || status === "CONFIRMED";
}

/** Payment can still be taken (late payments revive expired bookings). */
export function acceptsPayment(status: NikahStatusValue): boolean {
  return status === "PENDING_PAYMENT" || status === "EXPIRED";
}

/** Pending bookings past their hold are treated as expired. */
export function effectiveStatus(
  booking: { status: NikahStatusValue; expiresAt: Date | null },
  now: Date = new Date(),
): NikahStatusValue {
  if (booking.status === "PENDING_PAYMENT" && booking.expiresAt && booking.expiresAt <= now) return "EXPIRED";
  return booking.status;
}

/** Public timeline order; index of the last reached step, or -1. */
export const TIMELINE: readonly NikahStatusValue[] = ["PENDING_PAYMENT", "PAID", "CONFIRMED", "SOLEMNIZED"];

export function timelineIndex(status: NikahStatusValue): number {
  return TIMELINE.indexOf(status);
}
