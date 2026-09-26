import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const headingVariants = cva("font-display text-fg", {
  variants: {
    size: {
      hero: "text-display-hero",
      xl: "text-display-xl",
      lg: "text-display-lg",
      md: "text-display-md",
      sm: "text-display-sm",
    },
  },
  defaultVariants: { size: "lg" },
});

type Level = "h1" | "h2" | "h3" | "h4" | "p";

export interface HeadingProps extends ComponentProps<"h2">, VariantProps<typeof headingVariants> {
  as?: Level;
}

/**
 * Editorial display heading in Fraunces. Size is independent of level:
 *
 *   <Heading as="h1" size="hero">A house of prayer in Bauchi</Heading>
 *
 * Wrap a word in <em> for Fraunces' soft italic accent.
 */
export function Heading({ as: Comp = "h2", size, className, ...props }: HeadingProps) {
  return (
    <Comp
      data-slot="heading"
      className={cn(headingVariants({ size }), "[&_em]:italic [&_em]:[font-variation-settings:'SOFT'_100,'WONK'_1]", className)}
      {...props}
    />
  );
}
