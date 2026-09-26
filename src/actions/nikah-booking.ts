"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { t } from "@/i18n/en";
import { Prisma, prisma, type NikahBooking } from "@/lib/db";
import { getProvider, makeReference, PaymentConfigError } from "@/lib/payments";
import { getSiteSettings } from "@/lib/settings";
import { absoluteUrl } from "@/lib/utils";
import { getPublicBooking } from "@/lib/nikah/access";
import { formatBookingRef, normalizeBookingRef } from "@/lib/nikah/format";
import { emailBookingReceived, emailOfficeTransferClaim } from "@/lib/nikah/notify";
import { isInstantFree, slotsForDate, type SlotOption } from "@/lib/nikah/slots";
import { acceptsPayment } from "@/lib/nikah/state";
import { bookingWindow, lagosDateTime, lagosYear, slotLabelFor, weekdayOfYmd, YMD_PATTERN } from "@/lib/nikah/time";
import { payPath, signBookingToken, statusPath } from "@/lib/nikah/token";
import { lookupSchema, nikahBookingSchema, normalizePhone } from "@/lib/validation/nikah";

const errors = t.nikah.form.errors;
const HOLD_MS = 48 * 60 * 60 * 1000;

function inWindow(ymd: string): boolean {
  const { min, max } = bookingWindow();
  return ymd >= min && ymd <= max;
}

/** Slots for one Lagos date in the public booking window. */
export async function getAvailableSlots(dateISO: string): Promise<SlotOption[]> {
  if (!YMD_PATTERN.test(dateISO) || !inWindow(dateISO)) return [];
  return slotsForDate(dateISO);
}

export type CreateBookingResult =
  | { ok: true; url: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string>; step?: number };

/**
 * Validate, re-check the slot, create the booking with the next per-year
 * reference (retrying on a unique clash), email the couple, and return the
 * pay URL (the client clears its saved draft, then navigates).
 */
export async function createNikahBooking(input: unknown): Promise<CreateBookingResult> {
  const parsed = nikahBookingSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = String(issue.path[0] ?? "");
      if (k && !fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return { ok: false, error: errors.generic, fieldErrors };
  }
  const v = parsed.data;
  if (!inWindow(v.date)) return { ok: false, error: errors.dateRange, step: 0 };

  const slot = await prisma.nikahSlot.findUnique({ where: { id: v.slotId } });
  if (!slot || !slot.active || slot.weekday !== weekdayOfYmd(v.date) || slot.time !== v.time) {
    return { ok: false, error: errors.slotTaken, step: 0 };
  }
  const scheduledAt = lagosDateTime(v.date, slot.time);
  const settings = await getSiteSettings();
  const now = new Date();
  const year = lagosYear(now);
  const yearStart = lagosDateTime(`${year}-01-01`, "00:00");

  const data = {
    status: "PENDING_PAYMENT" as const,
    scheduledAt,
    slotLabel: slotLabelFor(scheduledAt),
    slotId: slot.id,
    groomName: v.groomName,
    groomPhone: normalizePhone(v.groomPhone),
    groomEmail: v.groomEmail,
    groomAddress: v.groomAddress,
    groomAge: v.groomAge,
    brideName: v.brideName,
    bridePhone: normalizePhone(v.bridePhone),
    brideEmail: v.brideEmail || null,
    brideAddress: v.brideAddress,
    brideAge: v.brideAge,
    waliName: v.waliName,
    waliRelationship: v.waliRelationship === "OTHER" ? v.waliRelationshipOther.trim() : t.nikah.form.wali.relationships[v.waliRelationship],
    waliPhone: normalizePhone(v.waliPhone),
    witness1Name: v.witness1Name,
    witness1Phone: normalizePhone(v.witness1Phone),
    witness2Name: v.witness2Name,
    witness2Phone: normalizePhone(v.witness2Phone),
    sadakiAmountKobo: Math.round(v.sadakiAmount * 100),
    sadakiStatus: v.sadakiStatus === "PAID" ? ("PAID" as const) : ("DEFERRED" as const),
    notes: v.notes || null,
    feeKobo: settings.nikahFeeKobo,
    checklist: v.sadakiStatus === "PARTLY" ? { sadakiPartly: true } : Prisma.DbNull,
    expiresAt: new Date(now.getTime() + HOLD_MS),
  };

  let booking: NikahBooking | null = null;
  for (let attempt = 0; attempt < 5 && !booking; attempt++) {
    let result: NikahBooking | "taken" | null = null;
    try {
      result = await prisma.$transaction(
        async (tx) => {
          if (!(await isInstantFree(scheduledAt, slot.capacity, { db: tx }))) return "taken" as const;
          const count = await tx.nikahBooking.count({ where: { createdAt: { gte: yearStart } } });
          return tx.nikahBooking.create({ data: { ...data, bookingRef: formatBookingRef(year, count + 1 + attempt) } });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (err) {
      const retryable =
        err instanceof Prisma.PrismaClientKnownRequestError && (err.code === "P2002" || err.code === "P2034");
      if (!retryable) {
        console.error("[nikah] createNikahBooking failed", err);
        return { ok: false, error: errors.generic };
      }
    }
    if (result === "taken") return { ok: false, error: errors.slotTaken, step: 0 };
    booking = result;
  }
  if (!booking) return { ok: false, error: errors.generic };

  await emailBookingReceived(booking);
  return { ok: true, url: payPath(booking.bookingRef) };
}

// ─── Payment ────────────────────────────────────────────────────────────────

export type PayActionState = { error?: string; notice?: string } | undefined;

async function payableBooking(ref: string, token: string) {
  const booking = await getPublicBooking(ref, token);
  if (!booking) return { error: t.nikah.pay.invalid } as const;
  if (!acceptsPayment(booking.status)) redirect(statusPath(booking.bookingRef));
  if (booking.status === "EXPIRED") return { error: t.nikah.pay.expired } as const;
  return { booking } as const;
}

/** Create an INITIATED gateway Payment and redirect to the hosted checkout. */
export async function startNikahPayment(ref: string, token: string, _prev: PayActionState): Promise<PayActionState> {
  void _prev;
  const r = await payableBooking(ref, token);
  if ("error" in r) return { error: r.error };
  const { booking } = r;
  const email = booking.groomEmail ?? booking.brideEmail;
  if (!email) return { error: t.nikah.pay.onlineUnavailable };

  let authorizationUrl: string;
  const reference = makeReference("NK");
  let created = false;
  try {
    const provider = getProvider();
    await prisma.payment.create({
      data: { bookingId: booking.id, provider: provider.id, reference, amountKobo: booking.feeKobo, status: "INITIATED" },
    });
    created = true;
    const init = await provider.initialize({
      amountKobo: booking.feeKobo,
      email,
      reference,
      callbackUrl: absoluteUrl("/nikah/pay/callback"),
      metadata: {
        kind: "nikah",
        id: booking.id,
        purpose: "nikah",
        payerName: booking.groomName,
        payerPhone: booking.groomPhone,
        narration: `Nikah ${booking.bookingRef}`,
      },
    });
    if (init.providerRef) await prisma.payment.update({ where: { reference }, data: { providerRef: init.providerRef } });
    authorizationUrl = init.authorizationUrl;
  } catch (err) {
    // Don't leave an orphan INITIATED row behind a checkout that never opened.
    if (created) await prisma.payment.deleteMany({ where: { reference, status: "INITIATED" } }).catch(() => undefined);
    if (err instanceof PaymentConfigError) return { error: t.nikah.pay.onlineUnavailable };
    console.error("[nikah] startNikahPayment failed", err);
    return { error: t.nikah.pay.onlineError };
  }
  redirect(authorizationUrl);
}

/** Create (or reuse) a BANK_TRANSFER Payment so the page can show its reference. */
export async function startBankTransfer(ref: string, token: string, _prev: PayActionState): Promise<PayActionState> {
  void _prev;
  const r = await payableBooking(ref, token);
  if ("error" in r) return { error: r.error };
  const existing = r.booking.payments.find((p) => p.provider === "BANK_TRANSFER" && p.status === "INITIATED");
  if (!existing) {
    await prisma.payment.create({
      data: {
        bookingId: r.booking.id,
        provider: "BANK_TRANSFER",
        reference: makeReference("BT"),
        amountKobo: r.booking.feeKobo,
        status: "INITIATED",
      },
    });
  }
  revalidatePath(`/nikah/pay/${r.booking.bookingRef}`);
  return undefined;
}

/** Payer says they transferred: flag the payment, extend the hold, email the office. */
export async function claimBankTransfer(ref: string, token: string, _prev: PayActionState): Promise<PayActionState> {
  void _prev;
  const r = await payableBooking(ref, token);
  if ("error" in r) return { error: r.error };
  const payment = r.booking.payments.find((p) => p.provider === "BANK_TRANSFER" && p.status === "INITIATED");
  if (!payment) return { error: t.nikah.form.errors.generic };
  const raw = (payment.raw && typeof payment.raw === "object" && !Array.isArray(payment.raw) ? payment.raw : {}) as Record<string, unknown>;
  if (!raw.claimedAt) {
    await prisma.$transaction([
      prisma.payment.update({ where: { id: payment.id }, data: { raw: { ...raw, claimedAt: new Date().toISOString() } } }),
      // Give the office time to check the account before the hold lapses.
      prisma.nikahBooking.update({ where: { id: r.booking.id }, data: { expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000) } }),
    ]);
    await emailOfficeTransferClaim(r.booking, payment.reference, payment.amountKobo);
  }
  revalidatePath(`/nikah/pay/${r.booking.bookingRef}`);
  return { notice: t.nikah.pay.claimed };
}

// ─── Lookup ─────────────────────────────────────────────────────────────────

export type LookupState = { error?: string; values?: { bookingRef: string } } | undefined;

/** Match a booking by ref + last 4 phone digits (groom or bride), then go to its tokenised status page. */
export async function lookupBooking(_prev: LookupState, formData: FormData): Promise<LookupState> {
  const parsed = lookupSchema.safeParse({
    bookingRef: formData.get("bookingRef"),
    phoneLast4: String(formData.get("phoneLast4") ?? "").replace(/\D/g, ""),
  });
  const typedRef = String(formData.get("bookingRef") ?? "");
  if (!parsed.success) return { error: t.nikah.lookup.notFound, values: { bookingRef: typedRef } };
  const ref = normalizeBookingRef(parsed.data.bookingRef);
  const booking = ref
    ? await prisma.nikahBooking.findUnique({ where: { bookingRef: ref }, select: { bookingRef: true, groomPhone: true, bridePhone: true } })
    : null;
  const last4 = parsed.data.phoneLast4;
  const match = booking && [booking.groomPhone, booking.bridePhone].some((p) => !!p && p.replace(/\D/g, "").endsWith(last4));
  if (!booking || !match) return { error: t.nikah.lookup.notFound, values: { bookingRef: typedRef } };
  redirect(`/nikah/${booking.bookingRef}?t=${signBookingToken(booking.bookingRef)}`);
}
