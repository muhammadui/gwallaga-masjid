import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { certificateSlug, normalizeBookingRef } from "@/lib/nikah/format";
import { verifyBookingToken } from "@/lib/nikah/token";

/** Stream the stored certificate PDF for a solemnized booking (token-gated). */
export async function GET(request: NextRequest, ctx: RouteContext<"/nikah/[bookingRef]/certificate.pdf">) {
  const { bookingRef } = await ctx.params;
  const ref = normalizeBookingRef(decodeURIComponent(bookingRef));
  const token = request.nextUrl.searchParams.get("t");
  if (!ref || !verifyBookingToken(ref, token)) return new Response("Not found", { status: 404 });

  const booking = await prisma.nikahBooking.findUnique({
    where: { bookingRef: ref },
    select: { status: true, certificate: { select: { certificateNo: true, pdf: true, revokedAt: true } } },
  });
  const cert = booking?.certificate;
  if (!booking || booking.status !== "SOLEMNIZED" || !cert || cert.revokedAt) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(cert.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="nikah-certificate-${certificateSlug(cert.certificateNo)}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
