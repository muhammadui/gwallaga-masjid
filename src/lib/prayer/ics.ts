import { MASJID_TIME_ZONE } from "./constants";
import { formatClock, zonedParts } from "./time";
import type { PrayerDay } from "./types";

/** RFC 5545 TEXT escaping. */
export function escapeIcsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Fold a content line to 75 octets (continuation lines start with a space). */
export function foldIcsLine(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let current = "";
  let size = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    const limit = out.length === 0 ? 75 : 74;
    if (size + n > limit) {
      out.push(current);
      current = "";
      size = 0;
    }
    current += ch;
    size += n;
  }
  out.push(current);
  return out.join("\r\n ");
}

const pad = (n: number) => String(n).padStart(2, "0");

function localStamp(date: Date): string {
  const p = zonedParts(date, MASJID_TIME_ZONE);
  return `${p.year}${pad(p.month)}${pad(p.day)}T${pad(p.hour)}${pad(p.minute)}00`;
}

function utcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * VCALENDAR with one 10-minute event per adhan (sunrise excluded) for the
 * given days, local times in TZID Africa/Lagos (WAT, UTC+1, no DST).
 */
export function buildPrayerIcs(days: PrayerDay[], opts: { calendarName: string; host: string; now?: Date }): string {
  const stamp = utcStamp(opts.now ?? new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Gwallaga Juma'at Masjid//Prayer times//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(opts.calendarName)}`,
    `X-WR-TIMEZONE:${MASJID_TIME_ZONE}`,
    "BEGIN:VTIMEZONE",
    `TZID:${MASJID_TIME_ZONE}`,
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:+0100",
    "TZOFFSETTO:+0100",
    "TZNAME:WAT",
    "END:STANDARD",
    "END:VTIMEZONE",
  ];
  for (const day of days) {
    for (const p of day.prayers) {
      if (p.key === "sunrise") continue;
      const end = new Date(p.adhan.getTime() + 10 * 60_000);
      const description = p.iqamah ? `Iqamah ${formatClock(p.iqamah)}` : "";
      lines.push(
        "BEGIN:VEVENT",
        `UID:${day.date}-${p.key}@${opts.host}`,
        `DTSTAMP:${stamp}`,
        `DTSTART;TZID=${MASJID_TIME_ZONE}:${localStamp(p.adhan)}`,
        `DTEND;TZID=${MASJID_TIME_ZONE}:${localStamp(end)}`,
        `SUMMARY:${escapeIcsText(`${p.nameEn} adhan`)}`,
        ...(description ? [`DESCRIPTION:${escapeIcsText(description)}`] : []),
        `LOCATION:${escapeIcsText("Gwallaga Juma'at Masjid, Murtala Muhammad Way, Bauchi")}`,
        "TRANSP:TRANSPARENT",
        "END:VEVENT",
      );
    }
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}
