"use server";

import { revalidatePath } from "next/cache";
import { t } from "@/i18n/en";
import { requireAdmin } from "@/lib/auth/require-admin";
import { Prisma, prisma, type NikahBooking } from "@/lib/db";
import { fill } from "@/lib/nikah/format";
import { renderCertificate } from "@/lib/nikah/issue";
import { mergeJournal } from "@/lib/nikah/journal";
import { emailBookingCancelled, emailBookingConfirmed, emailBookingRescheduled, emailCertificate } from "@/lib/nikah/notify";
import { sendReceiptOnce } from "@/lib/nikah/settle";
import { isInstantFree } from "@/lib/nikah/slots";
import { canReschedule, canTransition, type NikahStatusValue } from "@/lib/nikah/state";
import { lagosDateTime, slotLabelFor, weekdayOfYmd } from "@/lib/nikah/time";
import { cancelSchema, feeSchema, proposeSlotSchema, slotSchema, solemnizeSchema } from "@/lib/validation/nikah";

const a = t.nikah.admin;

export type AdminResult = { ok: boolean; message: string };

const ok = (message: string): AdminResult => ({ ok: true, message });
const fail = (message: string): AdminResult => ({ ok: false, message });

function refresh(bookingId?: string) {
  revalidatePath("/admin/nikah");
  if (bookingId) revalidatePath(`/admin/nikah/${bookingId}`);
  revalidatePath("/admin");
}

function forbidden(status: NikahStatusValue): AdminResult {
  return fail(fill(a.forbiddenTransition, { status: t.status[status].toLowerCase() }));
}

/**
 * Conditional status change: only succeeds if the row is still in `from`,
 * so double clicks and concurrent staff actions cannot skip states.
 */
async function transition(
  booking: NikahBooking,
  to: NikahStatusValue,
  data: Prisma.NikahBookingUpdateManyMutationInput = {},
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<boolean> {
  if (!canTransition(booking.status, to)) return false;
  const { count } = await db.nikahBooking.updateMany({ where: { id: booking.id, status: booking.status }, data: { ...data, status: to } });
  return count === 1;
}

const json = (v: unknown) => v as Prisma.InputJsonValue;

// ─── Status actions ─────────────────────────────────────────────────────────

export async function confirmBooking(bookingId: string): Promise<AdminResult> {
  await requireAdmin();
  const booking = await prisma.nikahBooking.findUnique({ where: { id: bookingId } });
  if (!booking) return fail(a.notFound);
  const done = await transition(booking, "CONFIRMED", {
    checklist: json(mergeJournal(booking.checklist, { confirmedAt: new Date().toISOString() })),
  });
  if (!done) return forbidden(booking.status);
  await emailBookingConfirmed(booking);
  refresh(bookingId);
  return ok(a.confirmed);
}

/** Bank transfer seen in the account: Payment SUCCESS, booking PENDING_PAYMENT/EXPIRED → PAID. */
export async function markTransferReceived(paymentId: string): Promise<AdminResult> {
  const { user } = await requireAdmin();
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { booking: true } });
  if (!payment || payment.provider !== "BANK_TRANSFER") return fail(a.notFound);
  if (payment.status === "SUCCESS") return ok(a.markedReceived);
  const booking = payment.booking;
  if (!canTransition(booking.status, "PAID")) return forbidden(booking.status);

  const raw = (payment.raw && typeof payment.raw === "object" && !Array.isArray(payment.raw) ? payment.raw : {}) as Record<string, unknown>;
  const settled = await prisma.$transaction(async (tx) => {
    const { count } = await tx.payment.updateMany({
      where: { id: payment.id, status: { not: "SUCCESS" } },
      data: {
        status: "SUCCESS",
        paidAt: new Date(),
        channel: "bank_transfer",
        raw: json({ ...raw, confirmedBy: user.id, confirmedAt: new Date().toISOString() }),
      },
    });
    if (count === 0) return false;
    return transition(booking, "PAID", { expiresAt: null }, tx);
  });
  if (!settled) return forbidden(booking.status);
  await sendReceiptOnce(payment.reference);
  refresh(booking.id);
  return ok(a.markedReceived);
}

export async function proposeSlot(input: { bookingId: string; date: string; time: string }): Promise<AdminResult> {
  await requireAdmin();
  const parsed = proposeSlotSchema.safeParse(input);
  if (!parsed.success) return fail(t.nikah.form.errors.slot);
  const { bookingId, date, time } = parsed.data;
  const booking = await prisma.nikahBooking.findUnique({ where: { id: bookingId } });
  if (!booking) return fail(a.notFound);
  if (!canReschedule(booking.status)) return forbidden(booking.status);

  const at = lagosDateTime(date, time);
  const slot = await prisma.nikahSlot.findUnique({ where: { weekday_time: { weekday: weekdayOfYmd(date), time } } });
  if (!(await isInstantFree(at, slot?.capacity ?? 1, { excludeBookingId: booking.id }))) return fail(a.slotClash);

  const previous = booking.scheduledAt;
  const journal = mergeJournal(booking.checklist, {});
  const reschedules = [...(journal.reschedules ?? []), { from: previous.toISOString(), to: at.toISOString(), at: new Date().toISOString() }];
  const updated = await prisma.nikahBooking.update({
    where: { id: booking.id },
    data: {
      scheduledAt: at,
      slotLabel: slotLabelFor(at),
      slotId: slot?.id ?? null,
      checklist: json({ ...journal, reschedules }),
    },
  });
  await emailBookingRescheduled(updated, previous);
  refresh(booking.id);
  return ok(a.proposed);
}

export async function cancelBooking(input: { bookingId: string; reason: string }): Promise<AdminResult> {
  await requireAdmin();
  const parsed = cancelSchema.safeParse(input);
  if (!parsed.success) return fail(t.nikah.form.errors.required);
  const booking = await prisma.nikahBooking.findUnique({ where: { id: parsed.data.bookingId } });
  if (!booking) return fail(a.notFound);
  const done = await transition(booking, "CANCELLED", {
    expiresAt: null,
    checklist: json(mergeJournal(booking.checklist, { cancelledAt: new Date().toISOString(), cancelReason: parsed.data.reason })),
  });
  if (!done) return forbidden(booking.status);
  await emailBookingCancelled(booking, parsed.data.reason);
  refresh(booking.id);
  return ok(a.cancelled);
}

// ─── Solemnize and certificate ──────────────────────────────────────────────

export async function solemnizeBooking(input: Record<string, unknown>): Promise<AdminResult> {
  const { user } = await requireAdmin();
  const parsed = solemnizeSchema.safeParse(input);
  if (!parsed.success) return fail(a.checklistIncomplete);
  const { bookingId, officiantName, ...verification } = parsed.data;
  const booking = await prisma.nikahBooking.findUnique({ where: { id: bookingId } });
  if (!booking) return fail(a.notFound);
  if (booking.status !== "CONFIRMED") return fail(a.solemnizeNotReady);

  const now = new Date();
  const { certificateNo, pdf } = await renderCertificate(booking, { solemnizedAt: now, officiantName, issuedAt: now });

  const done = await prisma.$transaction(async (tx) => {
    const moved = await transition(
      booking,
      "SOLEMNIZED",
      {
        solemnizedAt: now,
        officiantName,
        checklist: json(mergeJournal(booking.checklist, { verification, verifiedAt: now.toISOString(), verifiedBy: user.id })),
      },
      tx,
    );
    if (!moved) return false;
    await tx.certificate.upsert({
      where: { bookingId },
      create: { bookingId, certificateNo, pdf: Buffer.from(pdf), issuedAt: now, issuedById: user.id },
      update: { certificateNo, pdf: Buffer.from(pdf), issuedAt: now, issuedById: user.id, revokedAt: null },
    });
    return true;
  });
  if (!done) return forbidden(booking.status);

  const sent = await emailCertificate(booking, certificateNo, pdf);
  refresh(bookingId);
  return ok(sent.ok ? a.solemnized : `${a.solemnized} ${a.noEmail}`);
}

export async function regenerateCertificate(bookingId: string): Promise<AdminResult> {
  const { user } = await requireAdmin();
  const booking = await prisma.nikahBooking.findUnique({ where: { id: bookingId }, include: { certificate: true } });
  if (!booking) return fail(a.notFound);
  if (booking.status !== "SOLEMNIZED" || !booking.solemnizedAt) return fail(a.solemnizeNotReady);
  const now = new Date();
  const { certificateNo, pdf } = await renderCertificate(booking, {
    solemnizedAt: booking.solemnizedAt,
    officiantName: booking.officiantName ?? "",
    issuedAt: booking.certificate?.issuedAt ?? now,
  });
  await prisma.certificate.upsert({
    where: { bookingId },
    create: { bookingId, certificateNo, pdf: Buffer.from(pdf), issuedAt: now, issuedById: user.id },
    update: { certificateNo, pdf: Buffer.from(pdf) },
  });
  refresh(bookingId);
  return ok(a.regenerated);
}

export async function resendCertificate(bookingId: string): Promise<AdminResult> {
  await requireAdmin();
  const booking = await prisma.nikahBooking.findUnique({ where: { id: bookingId }, include: { certificate: true } });
  if (!booking?.certificate) return fail(a.notFound);
  if (booking.certificate.revokedAt) return fail(a.revoked);
  const sent = await emailCertificate(booking, booking.certificate.certificateNo, booking.certificate.pdf);
  return sent.ok ? ok(a.resent) : fail(a.noEmail);
}

export async function revokeCertificate(bookingId: string): Promise<AdminResult> {
  await requireAdmin(["ADMIN"]);
  const { count } = await prisma.certificate.updateMany({ where: { bookingId, revokedAt: null }, data: { revokedAt: new Date() } });
  if (count === 0) return fail(a.notFound);
  refresh(bookingId);
  return ok(a.revoked);
}

// ─── Slots and fee ──────────────────────────────────────────────────────────

export async function addSlot(_prev: AdminResult | undefined, formData: FormData): Promise<AdminResult> {
  await requireAdmin(["ADMIN"]);
  const parsed = slotSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(t.nikah.form.errors.slot);
  try {
    await prisma.nikahSlot.create({ data: parsed.data });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return fail(a.slots.exists);
    throw err;
  }
  revalidatePath("/admin/nikah/slots");
  revalidatePath("/nikah/book");
  return ok(a.slots.saved);
}

export async function toggleSlot(slotId: string): Promise<AdminResult> {
  await requireAdmin(["ADMIN"]);
  const slot = await prisma.nikahSlot.findUnique({ where: { id: slotId } });
  if (!slot) return fail(a.notFound);
  await prisma.nikahSlot.update({ where: { id: slotId }, data: { active: !slot.active } });
  revalidatePath("/admin/nikah/slots");
  revalidatePath("/nikah/book");
  return ok(a.slots.saved);
}

export async function deleteSlot(slotId: string): Promise<AdminResult> {
  await requireAdmin(["ADMIN"]);
  await prisma.nikahSlot.deleteMany({ where: { id: slotId } });
  revalidatePath("/admin/nikah/slots");
  revalidatePath("/nikah/book");
  return ok(a.slots.deleted);
}

export async function updateNikahFee(_prev: AdminResult | undefined, formData: FormData): Promise<AdminResult> {
  const { user } = await requireAdmin(["ADMIN"]);
  const parsed = feeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(t.nikah.form.errors.amount);
  const nikahFeeKobo = parsed.data.feeNaira * 100;
  await prisma.siteSettings.upsert({
    where: { id: "default" },
    create: { id: "default", nikahFeeKobo, updatedBy: user.id },
    update: { nikahFeeKobo, updatedBy: user.id },
  });
  revalidatePath("/", "layout");
  return ok(a.slots.feeSaved);
}
