import type { ComponentProps, ElementType } from "react";
import { cn } from "@/lib/utils";

const widths = {
  narrow: "max-w-[44rem]",
  default: "max-w-[88rem]",
  wide: "max-w-[112rem]",
  full: "max-w-none",
} as const;

export type ContainerProps<T extends ElementType = "div"> = {
  as?: T;
  size?: keyof typeof widths;
} & Omit<ComponentProps<T>, "as">;

/** Centred page width with the responsive gutter. 12-col grids go inside. */
export function Container<T extends ElementType = "div">({ as, size = "default", className, ...props }: ContainerProps<T>) {
  const Comp: ElementType = as ?? "div";
  return <Comp className={cn("mx-auto w-full gutter-x", widths[size], className)} {...props} />;
}
