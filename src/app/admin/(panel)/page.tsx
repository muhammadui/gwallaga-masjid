import type { Metadata } from "next";
import { prisma, type NikahStatus } from "@/lib/db";
import { t } from "@/i18n/en";
import { requireAdmin } from "@/lib/auth/require-admin";
import { formatNaira } from "@/lib/utils";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";

export const metadata: Metadata = { title: t.admin.dashboard };

const STATUSES: NikahStatus[] = ["PENDING_PAYMENT", "PAID", "CONFIRMED", "SOLEMNIZED", "CANCELLED", "EXPIRED"];

/** Start of the current month in Africa/Lagos (UTC+1, no DST), as a UTC instant. */
function startOfMonthLagos(now = new Date()): Date {
  const lagos = new Date(now.getTime() + 60 * 60 * 1000);
  return new Date(Date.UTC(lagos.getUTCFullYear(), lagos.getUTCMonth(), 1) - 60 * 60 * 1000);
}

export default async function AdminDashboard() {
  await requireAdmin();
  const monthStart = startOfMonthLagos();

  const [byStatus, monthDonations, pendingTransfers, campaigns] = await Promise.all([
    prisma.nikahBooking.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.donation.aggregate({
      where: { status: "SUCCESS", paidAt: { gte: monthStart } },
      _sum: { amountKobo: true },
      _count: { _all: true },
    }),
    prisma.donation.count({ where: { status: "PENDING_TRANSFER" } }),
    prisma.campaign.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, title: true, raisedKobo: true, targetKobo: true },
    }),
  ]);

  const counts = new Map(byStatus.map((r) => [r.status, r._count._all]));
  const monthLabel = new Intl.DateTimeFormat("en-NG", { month: "long", year: "numeric", timeZone: "Africa/Lagos" }).format(new Date());

  return (
    <div className="max-w-6xl">
      <Eyebrow>{monthLabel}</Eyebrow>
      <Heading as="h1" size="md" className="mt-5">
        {t.admin.dashboard}
      </Heading>

      <section aria-labelledby="donations-heading" className="mt-14 grid gap-px overflow-hidden rounded-[1.5rem] bg-line ring-1 ring-line sm:grid-cols-2">
        <div className="bg-ground p-8">
          <h2 id="donations-heading" className="text-eyebrow uppercase text-muted">
            {t.admin.donationsThisMonth}
          </h2>
          <p className="mt-5 font-display text-display-md tabular-nums">{formatNaira(monthDonations._sum.amountKobo ?? 0)}</p>
          <p className="mt-2 text-[0.875rem] text-muted">
            {monthDonations._count._all} {t.admin.successfulGifts}
          </p>
        </div>
        <div className="bg-ground p-8">
          <p className="text-eyebrow uppercase text-muted">{t.footer.giveByTransfer}</p>
          <p className="mt-5 font-display text-display-md tabular-nums">{pendingTransfers}</p>
          <p className="mt-2 text-[0.875rem] text-muted">{t.admin.pendingTransfers}</p>
        </div>
      </section>

      <section aria-labelledby="nikah-heading" className="mt-16">
        <h2 id="nikah-heading" className="text-eyebrow uppercase text-muted">
          {t.admin.bookingsByStatus}
        </h2>
        <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[1.5rem] bg-line ring-1 ring-line sm:grid-cols-3 lg:grid-cols-6">
          {STATUSES.map((s) => (
            <div key={s} className="bg-ground p-6">
              <dt className="text-[0.8125rem] text-muted">{t.status[s]}</dt>
              <dd className="mt-3 font-display text-display-sm tabular-nums">{counts.get(s) ?? 0}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="campaigns-heading" className="mt-16">
        <h2 id="campaigns-heading" className="text-eyebrow uppercase text-muted">
          {t.admin.activeCampaigns}
        </h2>
        <ul className="mt-6 divide-y divide-line hairline-y">
          {campaigns.map((c) => {
            const pct = c.targetKobo > 0 ? Math.min(100, Math.round((c.raisedKobo / c.targetKobo) * 100)) : 0;
            return (
              <li key={c.id} className="grid items-center gap-3 py-5 sm:grid-cols-[1fr_auto]">
                <div>
                  <p className="font-medium">{c.title}</p>
                  <div className="mt-3 h-px w-full bg-line">
                    <div className="h-px bg-indigo" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <p className="text-[0.875rem] tabular-nums text-muted sm:text-right">
                  {formatNaira(c.raisedKobo)} {t.admin.raised} {formatNaira(c.targetKobo)} · {pct}%
                </p>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
