import { t } from "@/i18n/en";
import type { NikahStatusValue } from "@/lib/nikah/state";
import { cn } from "@/lib/utils";

const TONE: Record<NikahStatusValue, string> = {
  PENDING_PAYMENT: "bg-clay/10 text-clay",
  PAID: "bg-indigo/10 text-indigo",
  CONFIRMED: "bg-indigo text-limestone",
  SOLEMNIZED: "bg-ink text-limestone",
  CANCELLED: "bg-ink/[0.06] text-muted line-through",
  EXPIRED: "bg-ink/[0.06] text-muted",
};

export function StatusPill({ status, className }: { status: NikahStatusValue; className?: string }) {
  return (
    <span className={cn("inline-flex h-7 items-center whitespace-nowrap rounded-full px-3 text-[0.75rem] font-medium", TONE[status], className)}>
      {t.status[status]}
    </span>
  );
}
