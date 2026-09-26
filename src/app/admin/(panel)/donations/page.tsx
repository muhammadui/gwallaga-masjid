import type { Metadata } from "next";
import Link from "next/link";
import { t } from "@/i18n/en";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { cn, formatNaira } from "@/lib/utils";
import { DONATION_FREQUENCIES, DONATION_PROVIDERS, DONATION_PURPOSES, DONATION_STATUSES } from "@/lib/donations/giving";
import { donationWhere, filtersToQuery, parseDonationFilters } from "@/lib/donations/filters";
import { confirmTransfer, markTransferFailed } from "@/actions/donation";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const a = t.donate.admin;
const PAGE_SIZE = 50;

export const metadata: Metadata = { title: a.title };

const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" });

const STATUS_TONE: Record<string, string> = {
  SUCCESS: "bg-indigo text-limestone",
  PENDING_TRANSFER: "bg-sand text-ink ring-1 ring-inset ring-(--hairline-gold)",
  INITIATED: "text-muted ring-1 ring-inset ring-line-strong",
  FAILED: "text-danger ring-1 ring-inset ring-danger/40",
};

function StatusPill({ status }: { status: keyof typeof t.donate.status }) {
  return (
    <span className={cn("inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-[0.75rem] font-medium", STATUS_TONE[status])}>
      {t.donate.status[status]}
    </span>
  );
}

const NOTICES: Record<string, string> = {
  confirmed: a.confirmed,
  failed: a.markedFailed,
  handled: a.alreadyHandled,
};

export default async function AdminDonationsPage({ searchParams }: PageProps<"/admin/donations">) {
  await requireAdmin();
  const sp = await searchParams;
  const filters = parseDonationFilters(sp);
  const where = donationWhere(filters);
  const page = Math.max(1, Number.parseInt(String(sp.page ?? "1"), 10) || 1);
  const notice = NOTICES[String(sp.notice ?? "")];

  const [pending, rows, total, sumAll, sumSuccess] = await Promise.all([
    prisma.donation.findMany({
      where: { status: "PENDING_TRANSFER" },
      orderBy: { createdAt: "asc" },
      include: { campaign: { select: { title: true } } },
      take: 100,
    }),
    prisma.donation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { campaign: { select: { title: true } } },
    }),
    prisma.donation.count({ where }),
    prisma.donation.aggregate({ where, _sum: { amountKobo: true, feesCoveredKobo: true } }),
    prisma.donation.aggregate({ where: { AND: [where, { status: "SUCCESS" }] }, _sum: { amountKobo: true }, _count: { _all: true } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const opt = (list: readonly string[], labels: Record<string, string>) => [
    { value: "", label: a.any },
    ...list.map((v) => ({ value: v, label: labels[v] ?? v })),
  ];

  return (
    <div className="max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <Eyebrow>{a.eyebrow}</Eyebrow>
          <Heading as="h1" size="md" className="mt-5">
            {a.title}
          </Heading>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="secondary" size="sm">
            <Link href="/admin/donations/campaigns">{a.campaignsLink}</Link>
          </Button>
          <Button asChild size="sm">
            <a href={`/admin/donations/export${filtersToQuery(filters)}`}>{a.exportCsv}</a>
          </Button>
        </div>
      </div>

      {notice ? (
        <p role="status" className="mt-8 rounded-[1rem] bg-surface px-5 py-3 text-[0.875rem] ring-1 ring-inset ring-(--hairline-gold)">
          {notice}
        </p>
      ) : null}

      {/* Pending transfers */}
      <section id="pending" aria-labelledby="pending-title" className="mt-12 scroll-mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="pending-title" className="font-display text-display-sm">
            {a.pendingTitle} <span className="tabular-nums text-muted">({pending.length})</span>
          </h2>
        </div>
        <p className="mt-2 max-w-2xl text-[0.875rem] text-muted">{a.pendingLede}</p>
        {pending.length === 0 ? (
          <p className="mt-6 text-[0.9375rem] text-muted">{a.pendingEmpty}</p>
        ) : (
          <ul className="mt-6 divide-y divide-line hairline-y">
            {pending.map((d) => (
              <li key={d.id} className="grid gap-4 py-5 md:grid-cols-[1fr_auto] md:items-center">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <span className="font-display text-[1.375rem] tabular-nums">{formatNaira(d.amountKobo)}</span>
                    <span className="font-mono text-[0.875rem] tracking-[0.03em]">{d.reference}</span>
                  </p>
                  <p className="mt-1 text-[0.8125rem] text-muted">
                    {d.donorName ?? "—"}
                    {d.anonymous ? ` (${a.anonymousTag})` : ""} · {d.donorPhone ?? d.donorEmail ?? "—"} ·{" "}
                    {d.purpose === "CAMPAIGN" && d.campaign ? d.campaign.title : t.donate.purposes[d.purpose]}
                    {d.campaign && d.purpose !== "CAMPAIGN" && d.campaign.title !== t.donate.purposes[d.purpose] ? ` → ${d.campaign.title}` : ""} · {dateFmt.format(d.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <form action={confirmTransfer.bind(null, d.id)}>
                    <Button type="submit" size="sm">
                      {a.confirmReceived}
                    </Button>
                  </form>
                  <form action={markTransferFailed.bind(null, d.id)}>
                    <Button type="submit" size="sm" variant="secondary">
                      {a.markFailed}
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Filters */}
      <section aria-labelledby="filters-title" className="mt-16">
        <h2 id="filters-title" className="text-eyebrow uppercase text-muted">
          {a.filters}
        </h2>
        <form method="get" action="/admin/donations" className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 xl:items-end">
          <div className="flex flex-col gap-2 sm:col-span-2 xl:col-span-2">
            <Label htmlFor="f-q">{a.search}</Label>
            <Input id="f-q" name="q" defaultValue={filters.q} placeholder={a.searchPlaceholder} className="h-11" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="f-status">{a.status}</Label>
            <Select id="f-status" name="status" defaultValue={filters.status ?? ""} options={opt(DONATION_STATUSES, t.donate.status)} className="h-11" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="f-purpose">{a.purpose}</Label>
            <Select id="f-purpose" name="purpose" defaultValue={filters.purpose ?? ""} options={opt(DONATION_PURPOSES, t.donate.purposes)} className="h-11" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="f-provider">{a.provider}</Label>
            <Select id="f-provider" name="provider" defaultValue={filters.provider ?? ""} options={opt(DONATION_PROVIDERS, t.donate.methods)} className="h-11" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="f-frequency">{a.frequency}</Label>
            <Select id="f-frequency" name="frequency" defaultValue={filters.frequency ?? ""} options={opt(DONATION_FREQUENCIES, t.donate.frequency)} className="h-11" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="f-from">{a.from}</Label>
            <Input id="f-from" type="date" name="from" defaultValue={filters.from} className="h-11" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="f-to">{a.to}</Label>
            <Input id="f-to" type="date" name="to" defaultValue={filters.to} className="h-11" />
          </div>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-4 xl:col-span-8">
            <Button type="submit" size="sm">
              {a.apply}
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/donations">{a.reset}</Link>
            </Button>
          </div>
        </form>
      </section>

      {/* Totals */}
      <section aria-label={a.totals} className="mt-10 grid gap-px overflow-hidden rounded-[1.5rem] bg-line ring-1 ring-line sm:grid-cols-3">
        <div className="bg-ground p-6">
          <p className="text-eyebrow uppercase text-muted">{a.totalReceived}</p>
          <p className="mt-4 font-display text-display-sm tabular-nums">{formatNaira(sumSuccess._sum.amountKobo ?? 0)}</p>
          <p className="mt-1 text-[0.8125rem] text-muted">{a.count(sumSuccess._count._all)}</p>
        </div>
        <div className="bg-ground p-6">
          <p className="text-eyebrow uppercase text-muted">{a.totalAll}</p>
          <p className="mt-4 font-display text-display-sm tabular-nums">{formatNaira(sumAll._sum.amountKobo ?? 0)}</p>
          <p className="mt-1 text-[0.8125rem] text-muted">{a.count(total)}</p>
        </div>
        <div className="bg-ground p-6">
          <p className="text-eyebrow uppercase text-muted">{a.totalFees}</p>
          <p className="mt-4 font-display text-display-sm tabular-nums">{formatNaira(sumAll._sum.feesCoveredKobo ?? 0, { decimals: true })}</p>
        </div>
      </section>

      {/* Table */}
      <div className="mt-8 overflow-x-auto rounded-[1.5rem] ring-1 ring-line">
        <table className="w-full min-w-[56rem] text-left text-[0.875rem]">
          <thead className="bg-limestone-deep/70 text-[0.75rem] uppercase tracking-[0.08em] text-muted">
            <tr>
              <th scope="col" className="px-5 py-3 font-medium">{a.colDate}</th>
              <th scope="col" className="px-5 py-3 font-medium">{a.colReference}</th>
              <th scope="col" className="px-5 py-3 font-medium">{a.colDonor}</th>
              <th scope="col" className="px-5 py-3 font-medium">{a.colPurpose}</th>
              <th scope="col" className="px-5 py-3 text-right font-medium">{a.colAmount}</th>
              <th scope="col" className="px-5 py-3 font-medium">{a.colMethod}</th>
              <th scope="col" className="px-5 py-3 font-medium">{a.colStatus}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-muted">
                  {a.noResults}
                </td>
              </tr>
            ) : (
              rows.map((d) => (
                <tr key={d.id} className="align-top">
                  <td className="whitespace-nowrap px-5 py-4 tabular-nums text-muted">{dateFmt.format(d.createdAt)}</td>
                  <td className="whitespace-nowrap px-5 py-4 font-mono text-[0.8125rem]">{d.reference}</td>
                  <td className="px-5 py-4">
                    <p className="font-medium">
                      {d.donorName ?? "—"}
                      {d.anonymous ? <span className="ml-2 text-[0.75rem] font-normal text-muted">{a.anonymousTag}</span> : null}
                    </p>
                    <p className="text-[0.8125rem] text-muted">{[d.donorEmail, d.donorPhone].filter(Boolean).join(" · ") || "—"}</p>
                  </td>
                  <td className="px-5 py-4">
                    {t.donate.purposes[d.purpose]}
                    {d.campaign ? <span className="block text-[0.8125rem] text-muted">{d.campaign.title}</span> : null}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-right tabular-nums">
                    {formatNaira(d.amountKobo)}
                    {d.feesCoveredKobo > 0 ? (
                      <span className="block text-[0.75rem] text-muted">+{formatNaira(d.feesCoveredKobo, { decimals: true })}</span>
                    ) : null}
                    {d.frequency === "MONTHLY" ? <span className="block text-[0.75rem] text-indigo">{a.monthlyTag}</span> : null}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-muted">
                    {t.donate.methods[d.provider]}
                    {d.channel ? <span className="block text-[0.75rem]">{d.channel}</span> : null}
                  </td>
                  <td className="px-5 py-4">
                    <StatusPill status={d.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 ? (
        <nav aria-label="Pagination" className="mt-6 flex items-center justify-between text-[0.875rem]">
          {page > 1 ? (
            <Link className="underline underline-offset-4" href={`/admin/donations${filtersToQuery(filters, { page: String(page - 1) })}`}>
              {a.prev}
            </Link>
          ) : (
            <span />
          )}
          <span className="tabular-nums text-muted">{a.page(page, pages)}</span>
          {page < pages ? (
            <Link className="underline underline-offset-4" href={`/admin/donations${filtersToQuery(filters, { page: String(page + 1) })}`}>
              {a.next}
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
