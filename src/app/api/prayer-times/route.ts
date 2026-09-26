import { getPrayerSettings } from "@/lib/settings";
import { getPrayerDayFor, getPrayerMonth, lagosDayKey, parseDayKey, parseMonthKey, serializePrayerDay } from "@/lib/prayer";

const CACHE = "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400";

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: status === 200 ? { "Cache-Control": CACHE } : { "Cache-Control": "no-store" },
  });
}

/**
 * GET /api/prayer-times              → today's PrayerDay (Africa/Lagos)
 * GET /api/prayer-times?date=2026-09-26
 * GET /api/prayer-times?month=2026-09 → PrayerDay[]
 * Dates are ISO strings.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get("month");
  const dateParam = searchParams.get("date");
  const settings = await getPrayerSettings();

  if (monthParam !== null) {
    const m = parseMonthKey(monthParam);
    if (!m) return json({ error: "month must be YYYY-MM" }, 400);
    return json(getPrayerMonth(m.year, m.month, settings).map(serializePrayerDay));
  }

  const d = parseDayKey(dateParam ?? lagosDayKey(new Date()));
  if (!d) return json({ error: "date must be YYYY-MM-DD" }, 400);
  return json(serializePrayerDay(getPrayerDayFor(d.year, d.month, d.day, settings)));
}
