import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { certificateSlug } from "@/lib/nikah/format";

/** Staff download of the stored certificate (including revoked ones). */
export async function GET(_request: Request, ctx: RouteContext<"/admin/nikah/[id]/certificate.pdf">) {
  await requireAdmin();
  const { id } = await ctx.params;
  const cert = await prisma.certificate.findUnique({ where: { bookingId: id }, select: { certificateNo: true, pdf: true } });
  if (!cert) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(cert.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="nikah-certificate-${certificateSlug(cert.certificateNo)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
