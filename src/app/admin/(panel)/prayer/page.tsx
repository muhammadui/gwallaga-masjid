import type { Metadata } from "next";
import { t } from "@/i18n/en";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getPrayerSettings } from "@/lib/settings";
import { normalizeMethod } from "@/lib/prayer/constants";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";
import { PrayerSettingsForm } from "./prayer-settings-form";

export const metadata: Metadata = { title: t.adminPrayer.title };

export default async function AdminPrayerPage() {
  await requireAdmin();
  const s = await getPrayerSettings();
  const lastUpdated =
    s.updatedAt.getTime() > 0
      ? new Intl.DateTimeFormat("en-GB", {
          timeZone: "Africa/Lagos",
          dateStyle: "medium",
          timeStyle: "short",
        }).format(s.updatedAt)
      : null;

  return (
    <div className="max-w-[72rem]">
      <Eyebrow>{t.admin.prayer}</Eyebrow>
      <Heading as="h1" size="md" className="mt-5">
        {t.adminPrayer.title}
      </Heading>
      <p className="mt-4 max-w-[60ch] text-muted">{t.adminPrayer.lede}</p>
      {lastUpdated ? (
        <p className="mt-2 text-[0.8125rem] text-muted">
          {t.adminPrayer.lastUpdated}: {lastUpdated}
          {s.updatedBy ? ` · ${s.updatedBy}` : ""}
        </p>
      ) : null}

      <PrayerSettingsForm
        defaults={{
          fajrIqamahOffset: s.fajrIqamahOffset,
          dhuhrIqamahOffset: s.dhuhrIqamahOffset,
          asrIqamahOffset: s.asrIqamahOffset,
          maghribIqamahOffset: s.maghribIqamahOffset,
          ishaIqamahOffset: s.ishaIqamahOffset,
          jumuahFirst: s.jumuahFirst,
          jumuahSecond: s.jumuahSecond ?? "",
          hijriOffsetDays: Math.max(-1, Math.min(1, s.hijriOffsetDays)),
          calculationMethod: normalizeMethod(s.calculationMethod),
        }}
      />
    </div>
  );
}
