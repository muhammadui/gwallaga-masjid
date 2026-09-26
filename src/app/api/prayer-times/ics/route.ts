import { getPrayerSettings } from "@/lib/settings";
import { getPrayerMonth, parseMonthKey, zonedParts } from "@/lib/prayer";
import { buildPrayerIcs } from "@/lib/prayer/ics";
import { t } from "@/i18n/en";

/** GET /api/prayer-times/ics?m=2026-09 → text/calendar of the month's adhan times. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const param = url.searchParams.get("m") ?? url.searchParams.get("month");
  const now = zonedParts(new Date());
  const month = param ? parseMonthKey(param) : { year: now.year, month: now.month };
  if (!month) return new Response("m must be YYYY-MM", { status: 400 });

  const days = getPrayerMonth(month.year, month.month, await getPrayerSettings());
  const key = `${month.year}-${String(month.month).padStart(2, "0")}`;
  const body = buildPrayerIcs(days, {
    calendarName: `${t.site.name} · ${t.prayer.title} · ${key}`,
    host: url.hostname || "gwallaga.org",
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="gwallaga-prayer-times-${key}.ics"`,
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
