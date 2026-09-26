import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export interface LabelProps extends ComponentProps<"label"> {
  required?: boolean;
}

export function Label({ className, required, children, ...props }: LabelProps) {
  return (
    <label
      data-slot="label"
      className={cn("inline-flex items-baseline gap-1.5 text-[0.8125rem] font-medium tracking-[0.005em] text-fg", className)}
      {...props}
    >
      {children}
      {required ? (
        <span aria-hidden className="text-clay">
          *
        </span>
      ) : null}
    </label>
  );
}
