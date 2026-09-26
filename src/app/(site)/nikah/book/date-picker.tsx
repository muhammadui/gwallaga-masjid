"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { t } from "@/i18n/en";
import { cn } from "@/lib/utils";

const d = t.nikah.form.date;

interface DatePickerProps {
  value: string;
  min: string;
  max: string;
  /** Weekdays (0 = Sunday) with at least one active slot. */
  weekdays: number[];
  onChange: (ymd: string) => void;
  invalid?: boolean;
}

const monthFmt = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const dayFmt = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

function ym(ymd: string) {
  return ymd.slice(0, 7);
}

function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + by, 1));
  return dt.toISOString().slice(0, 7);
}

/**
 * Month-grid date picker over the booking window. Days without an active
 * weekly slot are disabled. No motion beyond colour (form rule).
 */
export function DatePicker({ value, min, max, weekdays, onChange, invalid }: DatePickerProps) {
  const [month, setMonth] = useState(() => ym(value || min));
  // Follow external value changes (e.g. a restored draft) to the right month.
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    if (value) setMonth(ym(value));
  }
  const allowed = useMemo(() => new Set(weekdays), [weekdays]);

  const cells = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const first = new Date(Date.UTC(y, m - 1, 1));
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const blanks = first.getUTCDay();
    const out: ({ ymd: string; day: number; enabled: boolean; label: string } | null)[] = Array.from({ length: blanks }, () => null);
    for (let day = 1; day <= daysInMonth; day++) {
      const dt = new Date(Date.UTC(y, m - 1, day));
      const ymd = dt.toISOString().slice(0, 10);
      out.push({ ymd, day, enabled: ymd >= min && ymd <= max && allowed.has(dt.getUTCDay()), label: dayFmt.format(dt) });
    }
    return out;
  }, [month, min, max, allowed]);

  const canPrev = month > ym(min);
  const canNext = month < ym(max);
  const [y, m] = month.split("-").map(Number);

  return (
    <div className={cn("rounded-[1.5rem] p-4 ring-1 ring-inset sm:p-6", invalid ? "ring-danger/60" : "ring-line")}>
      <div className="flex items-center justify-between">
        <p className="font-display text-[1.25rem]" aria-live="polite">
          {monthFmt.format(new Date(Date.UTC(y, m - 1, 1)))}
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setMonth(shiftMonth(month, -1))}
            disabled={!canPrev}
            aria-label={d.prevMonth}
            className="inline-flex size-10 items-center justify-center rounded-full ring-1 ring-inset ring-line-strong transition-colors duration-300 hover:bg-ink/[0.05] disabled:opacity-30"
          >
            <ChevronLeft size={16} strokeWidth={1.4} />
          </button>
          <button
            type="button"
            onClick={() => setMonth(shiftMonth(month, 1))}
            disabled={!canNext}
            aria-label={d.nextMonth}
            className="inline-flex size-10 items-center justify-center rounded-full ring-1 ring-inset ring-line-strong transition-colors duration-300 hover:bg-ink/[0.05] disabled:opacity-30"
          >
            <ChevronRight size={16} strokeWidth={1.4} />
          </button>
        </div>
      </div>
      <div role="grid" className="mt-5 grid grid-cols-7 gap-y-1 text-center">
        {d.weekdays.map((w) => (
          <div key={w} role="columnheader" className="pb-2 text-eyebrow uppercase text-muted">
            {w}
          </div>
        ))}
        {cells.map((c, i) =>
          c ? (
            <button
              key={c.ymd}
              type="button"
              role="gridcell"
              disabled={!c.enabled}
              aria-selected={value === c.ymd}
              aria-label={c.label}
              onClick={() => onChange(c.ymd)}
              className={cn(
                "mx-auto flex size-11 items-center justify-center rounded-full text-[0.9375rem] tabular-nums transition-colors duration-300",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ring)",
                c.enabled ? "font-medium hover:bg-ink/[0.06]" : "text-muted/45",
                value === c.ymd && "bg-accent text-accent-fg hover:bg-accent",
              )}
            >
              {c.day}
            </button>
          ) : (
            <span key={`b${i}`} aria-hidden />
          ),
        )}
      </div>
    </div>
  );
}
