import "server-only";
import { prisma } from "@/lib/db";
import { normalizeBookingRef } from "./format";
import { effectiveStatus } from "./state";
import { verifyBookingToken } from "./token";

/**
 * Load a booking for a public page (status, pay) after checking the signed
 * `?t=` token. Pending bookings past their 48h hold are lazily flipped to
 * EXPIRED here (conditional update, so a racing payment wins).
 */
export async function getPublicBooking(rawRef: string, token: string | null | undefined) {
  const ref = normalizeBookingRef(decodeURIComponent(rawRef));
  if (!ref || !verifyBookingToken(ref, token)) return null;
  const booking = await prisma.nikahBooking.findUnique({
    where: { bookingRef: ref },
    include: { payments: { orderBy: { createdAt: "desc" } }, certificate: { select: { certificateNo: true, issuedAt: true, revokedAt: true } } },
  });
  if (!booking) return null;
  if (booking.status === "PENDING_PAYMENT" && effectiveStatus(booking) === "EXPIRED") {
    await prisma.nikahBooking.updateMany({ where: { id: booking.id, status: "PENDING_PAYMENT" }, data: { status: "EXPIRED" } });
    booking.status = "EXPIRED";
  }
  return booking;
}

export type PublicBooking = NonNullable<Awaited<ReturnType<typeof getPublicBooking>>>;
