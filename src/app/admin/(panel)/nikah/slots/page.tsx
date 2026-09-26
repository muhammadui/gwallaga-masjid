import type { Metadata } from "next";
import Link from "next/link";
import { t } from "@/i18n/en";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSiteSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";
import { AddSlotForm, FeeForm, SlotRowActions } from "./slot-forms";

const a = t.nikah.admin;
const s = a.slots;

export const metadata: Metadata = { title: s.title };

// Monday-first display order.
const ORDER = [1, 2, 3, 4, 5, 6, 0];

export default async function AdminNikahSlotsPage() {
  await requireAdmin(["ADMIN"]);
  const [slots, site] = await Promise.all([prisma.nikahSlot.findMany({ orderBy: [{ weekday: "asc" }, { time: "asc" }] }), getSiteSettings()]);
  const sorted = [...slots].sort((x, y) => ORDER.indexOf(x.weekday) - ORDER.indexOf(y.weekday) || x.time.localeCompare(y.time));

  return (
    <div className="max-w-4xl">
      <Link href="/admin/nikah" className="text-[0.8125rem] text-muted underline-offset-4 hover:underline">
        ← {a.back}
      </Link>
      <Eyebrow className="mt-6">{t.admin.nikah}</Eyebrow>
      <Heading as="h1" size="md" className="mt-5">
        {s.title}
      </Heading>
      <p className="mt-3 text-muted">{s.lede}</p>

      <section className="mt-12 hairline-t py-8">
        <FeeForm feeNaira={Math.round(site.nikahFeeKobo / 100)} />
      </section>

      <section className="hairline-t py-8">
        {sorted.length === 0 ? (
          <p className="text-muted">{s.none}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-[0.875rem]">
              <thead>
                <tr className="hairline-b text-[0.75rem] uppercase tracking-[0.08em] text-muted">
                  <th className="py-3 pr-4 font-medium">{s.weekday}</th>
                  <th className="py-3 pr-4 font-medium">{s.time}</th>
                  <th className="py-3 pr-4 font-medium">{s.capacity}</th>
                  <th className="py-3 pr-4 font-medium">{a.colStatus}</th>
                  <th className="py-3" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((slot) => (
                  <tr key={slot.id} className={cn("hairline-b", !slot.active && "text-muted")}>
                    <td className="py-3 pr-4">{s.weekdays[slot.weekday]}</td>
                    <td className="py-3 pr-4 tabular-nums">{slot.time}</td>
                    <td className="py-3 pr-4 tabular-nums">{slot.capacity}</td>
                    <td className="py-3 pr-4">{slot.active ? s.active : s.paused}</td>
                    <td className="py-3">
                      <SlotRowActions slotId={slot.id} active={slot.active} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-10">
          <AddSlotForm />
        </div>
      </section>
    </div>
  );
}
