import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface EyebrowProps extends ComponentProps<"p"> {
  /** Optional index, e.g. "01", set before the rule. */
  index?: ReactNode;
  /** Hide the leading hairline. */
  bare?: boolean;
}

/** Small-caps label preceding a heading, with a gold hairline. */
export function Eyebrow({ index, bare, className, children, ...props }: EyebrowProps) {
  return (
    <p
      data-slot="eyebrow"
      className={cn(
        "inline-flex items-center gap-3 font-sans text-eyebrow font-medium uppercase text-muted",
        className,
      )}
      {...props}
    >
      {index ? <span className="tabular-nums text-fg">{index}</span> : null}
      {bare ? null : <span aria-hidden className="h-px w-8 bg-(--hairline-gold)" />}
      <span>{children}</span>
    </p>
  );
}
