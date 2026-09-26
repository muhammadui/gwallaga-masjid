import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { controlBase } from "./field-styles";

export function Input({ className, type = "text", ...props }: ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      type={type}
      className={cn(controlBase, "h-12 px-4 text-[0.9375rem]", "file:mr-3 file:border-0 file:bg-transparent file:font-medium", className)}
      {...props}
    />
  );
}
