import type { ComponentProps, ReactNode } from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Magnetic } from "./magnetic";

export const buttonVariants = cva(
  [
    "group/button relative inline-flex shrink-0 items-center justify-center gap-3 whitespace-nowrap",
    "rounded-full font-sans font-medium tracking-[-0.005em] select-none",
    "transition-[background-color,color,box-shadow,transform] duration-500 ease-[var(--ease-spring)]",
    "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45",
    "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-(--ring)",
  ],
  {
    variants: {
      variant: {
        primary: [
          "bg-accent text-accent-fg",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_18px_40px_-22px_rgba(31,42,90,0.75)]",
          "hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_24px_50px_-22px_rgba(31,42,90,0.9)]",
        ],
        secondary: [
          "bg-transparent text-fg ring-1 ring-inset ring-line-strong",
          "hover:bg-[color-mix(in_oklab,var(--fg)_5%,transparent)] hover:ring-(--fg)",
        ],
        ghost: ["bg-transparent text-fg hover:bg-[color-mix(in_oklab,var(--fg)_6%,transparent)]"],
      },
      size: {
        sm: "h-9 px-4 text-[0.8125rem]",
        md: "h-12 px-6 text-[0.9375rem]",
        lg: "h-14 px-7 text-base",
      },
      withIcon: { true: "", false: "" },
    },
    compoundVariants: [
      { size: "sm", withIcon: true, className: "pr-1.5" },
      { size: "md", withIcon: true, className: "pr-2" },
      { size: "lg", withIcon: true, className: "pr-2.5" },
    ],
    defaultVariants: { variant: "primary", size: "md", withIcon: false },
  },
);

const iconShell = cva(
  [
    "inline-flex shrink-0 items-center justify-center rounded-full",
    "transition-transform duration-500 ease-[var(--ease-spring)]",
    "group-hover/button:translate-x-0.5 group-hover/button:-translate-y-px group-hover/button:scale-105",
  ],
  {
    variants: {
      variant: {
        primary: "bg-[color-mix(in_oklab,var(--accent-fg)_14%,transparent)]",
        secondary: "bg-[color-mix(in_oklab,var(--fg)_7%,transparent)]",
        ghost: "bg-[color-mix(in_oklab,var(--fg)_7%,transparent)]",
      },
      size: { sm: "size-6", md: "size-8", lg: "size-10" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends ComponentProps<"button">,
    Omit<VariantProps<typeof buttonVariants>, "withIcon"> {
  /** Render the child element (e.g. next/link) with button styles. */
  asChild?: boolean;
  /**
   * Trailing icon nested in its own circle ("button-in-button"). Pass `true`
   * for the default ↗ arrow, or any icon node.
   */
  icon?: ReactNode | true;
  /** Wrap in a magnetic hover (client). Use on primary CTAs only. */
  magnetic?: boolean;
}

/**
 * Pill button. Variants: primary (indigo), secondary (hairline outline), ghost.
 *
 *   <Button icon>Give now</Button>
 *   <Button asChild variant="secondary"><Link href="/nikah">Nikah</Link></Button>
 *   <Button magnetic icon size="lg">Book a date</Button>
 */
export function Button({
  className,
  variant,
  size,
  asChild = false,
  icon,
  magnetic = false,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  const hasIcon = icon !== undefined && icon !== false && icon !== null;
  const iconSize = size === "sm" ? 13 : size === "lg" ? 18 : 15;

  // An array (not a Fragment): Radix Slot must see Slottable as a direct child,
  // otherwise asChild + icon merges the classes into the Fragment and loses them.
  const content = hasIcon
    ? [
        <Slot.Slottable key="label">{children}</Slot.Slottable>,
        <span key="icon" aria-hidden className={iconShell({ variant, size })}>
          {icon === true ? <ArrowUpRight size={iconSize} strokeWidth={1.4} /> : icon}
        </span>,
      ]
    : children;

  const el = (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, withIcon: hasIcon }), className)}
      {...(!asChild && !props.type ? { type: "button" as const } : {})}
      {...props}
    >
      {content}
    </Comp>
  );

  return magnetic ? <Magnetic>{el}</Magnetic> : el;
}
