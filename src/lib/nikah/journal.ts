/**
 * NikahBooking.checklist (Json) holds the day-of verification checklist plus
 * a small journal of facts the schema has no column for (sadaki "partly
 * paid", confirmation/cancellation times, cancel reason, reschedules).
 *
 *   {
 *     verification?: { waliConsent, witnesses, sadakiDeclared, groomConsent, brideConsent, idsSighted },
 *     verifiedAt?: ISO, verifiedBy?: userId,
 *     sadakiPartly?: true,
 *     confirmedAt?: ISO, cancelledAt?: ISO, cancelReason?: string,
 *     reschedules?: [{ from: ISO, to: ISO, at: ISO }]
 *   }
 */

export const CHECKLIST_KEYS = [
  "waliConsent",
  "witnesses",
  "sadakiDeclared",
  "groomConsent",
  "brideConsent",
  "idsSighted",
] as const;

export type ChecklistKey = (typeof CHECKLIST_KEYS)[number];
export type Verification = Record<ChecklistKey, boolean>;

export interface BookingJournal {
  verification?: Verification;
  verifiedAt?: string;
  verifiedBy?: string;
  sadakiPartly?: boolean;
  confirmedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  reschedules?: { from: string; to: string; at: string }[];
}

export function readJournal(value: unknown): BookingJournal {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as BookingJournal) : {};
}

export function mergeJournal(value: unknown, patch: Partial<BookingJournal>): BookingJournal {
  return { ...readJournal(value), ...patch };
}

export function isChecklistComplete(v: Partial<Record<ChecklistKey, unknown>>): v is Verification {
  return CHECKLIST_KEYS.every((k) => v[k] === true);
}

export type SadakiDisplay = "PAID" | "DEFERRED" | "PARTLY";

/** Three-way sadaki status (the enum has PAID/DEFERRED; "partly" lives in the journal). */
export function sadakiDisplay(booking: { sadakiStatus: "PAID" | "DEFERRED"; checklist: unknown }): SadakiDisplay {
  if (booking.sadakiStatus === "DEFERRED" && readJournal(booking.checklist).sadakiPartly) return "PARTLY";
  return booking.sadakiStatus;
}
