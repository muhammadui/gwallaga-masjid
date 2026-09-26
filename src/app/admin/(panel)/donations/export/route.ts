import { t } from "@/i18n/en";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { toCsv } from "@/lib/donations/csv";
import { donationWhere, parseDonationFilters } from "@/lib/donations/filters";

/** CSV of the currently filtered donations (same filters as the list page). */
export async function GET(request: Request) {
  await requireAdmin();
  const filters = parseDonationFilters(new URL(request.url).searchParams);
  const rows = await prisma.donation.findMany({
    where: donationWhere(filters),
    orderBy: { createdAt: "desc" },
    take: 50_000,
    include: { campaign: { select: { slug: true } } },
  });

  const header = [
    "created_at",
    "paid_at",
    "reference",
    "status",
    "purpose",
    "campaign",
    "frequency",
    "method",
    "channel",
    "amount_naira",
    "fees_covered_naira",
    "charged_naira",
    "donor_name",
    "donor_email",
    "donor_phone",
    "anonymous",
    "subscription_code",
    "subscription_active",
  ];
  const csv = toCsv(
    header,
    rows.map((d) => [
      d.createdAt,
      d.paidAt,
      d.reference,
      t.donate.status[d.status],
      t.donate.purposes[d.purpose],
      d.campaign?.slug ?? "",
      t.donate.frequency[d.frequency],
      t.donate.methods[d.provider],
      d.channel,
      d.amountKobo / 100,
      d.feesCoveredKobo / 100,
      (d.amountKobo + d.feesCoveredKobo) / 100,
      d.donorName,
      d.donorEmail,
      d.donorPhone,
      d.anonymous,
      d.paystackSubscriptionCode,
      d.subscriptionActive,
    ]),
  );

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gwallaga-donations-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
