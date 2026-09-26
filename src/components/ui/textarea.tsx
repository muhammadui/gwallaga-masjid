import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { controlBase } from "./field-styles";

export function Textarea({ className, rows = 4, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      rows={rows}
      className={cn(controlBase, "min-h-28 resize-y px-4 py-3 text-[0.9375rem] leading-relaxed", className)}
      {...props}
    />
  );
}
