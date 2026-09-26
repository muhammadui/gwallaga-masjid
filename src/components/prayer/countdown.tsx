"use client";

import { formatCountdown } from "@/lib/prayer/format";
import { cn } from "@/lib/utils";
import { useNow } from "./use-now";

export interface CountdownProps {
  /** ISO instant to count down to. */
  at: string;
  /** Server render time (epoch ms): the value shown until hydration. */
  serverNow: number;
  className?: string;
  label?: string;
}

/**
 * HH:MM:SS to `at`, ticking on the shared one-second clock. Digits never
 * animate (tabular figures, fixed width, so nothing shifts).
 */
export function Countdown({ at, serverNow, className, label }: CountdownProps) {
  const now = useNow() ?? serverNow;
  const seconds = Math.max(0, Math.ceil((new Date(at).getTime() - now) / 1000));
  const text = formatCountdown(seconds);
  return (
    <time
      dateTime={`PT${Math.floor(seconds / 3600)}H${Math.floor((seconds % 3600) / 60)}M${seconds % 60}S`}
      aria-label={label ? `${label} ${text}` : undefined}
      className={cn("inline-block tabular-nums [font-variant-numeric:tabular-nums]", className)}
    >
      {text}
    </time>
  );
}
