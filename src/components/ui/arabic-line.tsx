import type { ComponentProps, ElementType } from "react";
import { cn } from "@/lib/utils";

export type ArabicLineProps<T extends ElementType = "p"> = {
  as?: T;
  /** "liturgical" = Amiri (Qur'an, du'a, prayer names). "ui" = IBM Plex Sans Arabic. */
  variant?: "liturgical" | "ui";
} & Omit<ComponentProps<T>, "as">;

/**
 * Arabic text, right-to-left, set 12% larger than surrounding Latin so the two
 * scripts read at the same optical size.
 *
 *   <ArabicLine>بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</ArabicLine>
 */
export function ArabicLine<T extends ElementType = "p">({
  as,
  variant = "liturgical",
  className,
  ...props
}: ArabicLineProps<T>) {
  const Comp: ElementType = as ?? "p";
  return (
    <Comp
      lang="ar"
      dir="rtl"
      className={cn(variant === "liturgical" ? "font-arabic" : "font-arabic-ui", "text-[112%]", className)}
      {...props}
    />
  );
}
