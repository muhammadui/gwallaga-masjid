import type { Metadata } from "next";
import Link from "next/link";
import { t } from "@/i18n/en";
import { prisma, type NikahStatus, type Prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { cn, formatNaira } from "@/lib/utils";
import { effectiveStatus } from "@/lib/nikah/state";
import { formatLagosShort } from "@/lib/nikah/time";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusPill } from "./status-pill";

const a = t.nikah.admin;
const STATUSES: NikahStatus[] = ["PENDING_PAYMENT", "PAID", "CONFIRMED", "SOLEMNIZED", "CANCELLED", "EXPIRED"];

export const metadata: Metadata = { title: a.title };

export default async function AdminNikahListPage({ searchParams }: PageProps<"/admin/nikah">) {
  await requireAdmin();
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as NikahStatus) ? (sp.status as NikahStatus) : undefined;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const sort = sp.sort === "desc" ? "desc" : "asc";

  const digits = q.replace(/\D/g, "");
  const where: Prisma.NikahBookingWhereInput = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { bookingRef: { contains: q, mode: "insensitive" } },
            { groomName: { contains: q, mode: "insensitive" } },
            { brideName: { contains: q, mode: "insensitive" } },
            ...(digits.length >= 4
              ? [{ groomPhone: { contains: digits.slice(-10) } }, { bridePhone: { contains: digits.slice(-10) } }]
              : []),
          ],
        }
      : {}),
  };

  const [bookings, grouped] = await Promise.all([
    prisma.nikahBooking.findMany({
      where,
      orderBy: { scheduledAt: sort },
      take: 200,
      select: {
        id: true,
        bookingRef: true,
        status: true,
        expiresAt: true,
        scheduledAt: true,
        groomName: true,
        brideName: true,
        groomPhone: true,
        feeKobo: true,
      },
    }),
    prisma.nikahBooking.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const counts = new Map(grouped.map((g) => [g.status, g._count._all]));
  const total = grouped.reduce((n, g) => n + g._count._all, 0);

  const href = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { status, q: q || undefined, sort: sort === "desc" ? "desc" : undefined, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const s = params.toString();
    return `/admin/nikah${s ? `?${s}` : ""}`;
  };

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <Eyebrow>{t.admin.nikah}</Eyebrow>
          <Heading as="h1" size="md" className="mt-5">
            {a.title}
          </Heading>
          <p className="mt-3 text-muted">{a.lede}</p>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link href="/admin/nikah/slots">{a.slotsLink}</Link>
        </Button>
      </div>

      <nav aria-label={a.filter} className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-[1.5rem] bg-line ring-1 ring-line sm:grid-cols-4 lg:grid-cols-7">
        <Link href={href({ status: undefined })} aria-current={!status ? "page" : undefined} className={cn("bg-ground p-5 transition-colors duration-300 hover:bg-surface", !status && "bg-surface")}>
          <span className="text-[0.8125rem] text-muted">{a.all}</span>
          <span className="mt-2 block font-display text-display-sm tabular-nums">{total}</span>
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={href({ status: s })}
            aria-current={status === s ? "page" : undefined}
            className={cn("bg-ground p-5 transition-colors duration-300 hover:bg-surface", status === s && "bg-surface shadow-[inset_0_-2px_0_var(--color-indigo)]")}
          >
            <span className="text-[0.8125rem] text-muted">{t.status[s]}</span>
            <span className="mt-2 block font-display text-display-sm tabular-nums">{counts.get(s) ?? 0}</span>
          </Link>
        ))}
      </nav>

      <form method="get" className="mt-8 flex flex-wrap items-center gap-3">
        <Input name="q" defaultValue={q} placeholder={a.search} aria-label={a.search} className="h-11 max-w-sm flex-1" />
        <Select
          name="status"
          defaultValue={status ?? ""}
          aria-label={a.colStatus}
          className="h-11"
          options={[{ value: "", label: a.allStatuses }, ...STATUSES.map((s) => ({ value: s, label: t.status[s] }))]}
        />
        <Select
          name="sort"
          defaultValue={sort}
          aria-label={a.colWhen}
          className="h-11"
          options={[
            { value: "asc", label: a.sortSoonest },
            { value: "desc", label: a.sortLatest },
          ]}
        />
        <Button type="submit" size="sm">
          {a.filter}
        </Button>
        {q || status || sort === "desc" ? (
          <Link href="/admin/nikah" className="text-[0.8125rem] text-muted underline underline-offset-4">
            {a.clear}
          </Link>
        ) : null}
      </form>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[44rem] text-left text-[0.875rem]">
          <thead>
            <tr className="hairline-b text-[0.75rem] uppercase tracking-[0.08em] text-muted">
              <th className="py-3 pr-4 font-medium">{a.colRef}</th>
              <th className="py-3 pr-4 font-medium">{a.colCouple}</th>
              <th className="py-3 pr-4 font-medium">
                <Link href={href({ sort: sort === "asc" ? "desc" : undefined })} className="inline-flex items-center gap-1 hover:text-fg">
                  {a.colWhen} <span aria-hidden>{sort === "asc" ? "↑" : "↓"}</span>
                </Link>
              </th>
              <th className="py-3 pr-4 font-medium">{a.colStatus}</th>
              <th className="py-3 text-right font-medium">{a.colFee}</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-16 text-center text-muted">
                  {a.empty}
                </td>
              </tr>
            ) : (
              bookings.map((b) => (
                <tr key={b.id} className="group hairline-b transition-colors duration-300 hover:bg-surface">
                  <td className="py-4 pr-4">
                    <Link href={`/admin/nikah/${b.id}`} className="font-mono text-[0.8125rem] font-medium underline-offset-4 group-hover:underline">
                      {b.bookingRef}
                    </Link>
                  </td>
                  <td className="py-4 pr-4">
                    <Link href={`/admin/nikah/${b.id}`} className="block">
                      {b.groomName} <span className="text-muted">&amp;</span> {b.brideName}
                      <span className="block text-[0.75rem] text-muted">{b.groomPhone}</span>
                    </Link>
                  </td>
                  <td className="py-4 pr-4 tabular-nums">{formatLagosShort(b.scheduledAt)}</td>
                  <td className="py-4 pr-4">
                    <StatusPill status={effectiveStatus(b)} />
                  </td>
                  <td className="py-4 text-right tabular-nums">{formatNaira(b.feeKobo)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
