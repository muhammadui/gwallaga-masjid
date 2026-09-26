import { cn } from "@/lib/utils";

export interface DividerProps {
  className?: string;
  /** Centre a small 8-point star ornament on the rule. */
  ornament?: boolean;
  /** "gold" (default) or the tone's neutral hairline. */
  tone?: "gold" | "line";
}

/** 1px hairline rule. Gold is reserved for rules and the certificate. */
export function Divider({ className, ornament = false, tone = "gold" }: DividerProps) {
  const color = tone === "gold" ? "bg-(--hairline-gold)" : "bg-line";
  if (!ornament) {
    return <hr className={cn("h-px w-full border-0", color, className)} />;
  }
  return (
    <div role="separator" className={cn("flex w-full items-center gap-4", className)}>
      <span className={cn("h-px flex-1", color)} />
      <svg aria-hidden viewBox="0 0 24 24" className="size-3.5 text-gold" fill="none" stroke="currentColor" strokeWidth={1}>
        <rect x="5" y="5" width="14" height="14" />
        <rect x="5" y="5" width="14" height="14" transform="rotate(45 12 12)" />
      </svg>
      <span className={cn("h-px flex-1", color)} />
    </div>
  );
}
