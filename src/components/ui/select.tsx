import type { ComponentProps } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { controlBase } from "./field-styles";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends ComponentProps<"select"> {
  options?: SelectOption[];
  placeholder?: string;
}

/**
 * Native select (best on low-end Android + screen readers), styled to match.
 * Pass `options`, or `<option>` children.
 */
export function Select({ className, options, placeholder, children, ...props }: SelectProps) {
  return (
    <span className="relative block">
      <select
        data-slot="select"
        className={cn(controlBase, "h-12 appearance-none pl-4 pr-11 text-[0.9375rem]", className)}
        {...props}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options?.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
        {children}
      </select>
      <ChevronDown
        aria-hidden
        size={16}
        strokeWidth={1.4}
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted"
      />
    </span>
  );
}
