import type { ComponentProps, ElementType } from "react";
import { cn } from "@/lib/utils";

export type SectionTone = "limestone" | "indigo" | "sand";

export type SectionProps<T extends ElementType = "section"> = {
  as?: T;
  /** Background + text scheme. Sets semantic tokens so children adapt. */
  tone?: SectionTone;
  /** Vertical rhythm: "default" = --section-y, "tight" = half, "none". */
  spacing?: "default" | "tight" | "none";
} & Omit<ComponentProps<T>, "as">;

/**
 * Page band. Applies --section-y (clamp 6rem → 15rem) and a tone:
 *
 *   <Section tone="indigo" aria-labelledby="minbar-title">…</Section>
 */
export function Section<T extends ElementType = "section">({
  as,
  tone,
  spacing = "default",
  className,
  ...props
}: SectionProps<T>) {
  const Comp: ElementType = as ?? "section";
  return (
    <Comp
      data-tone={tone}
      className={cn(
        "relative isolate",
        tone && `tone-${tone}`,
        spacing === "default" && "py-(--section-y)",
        spacing === "tight" && "py-[calc(var(--section-y)/2)]",
        className,
      )}
      {...props}
    />
  );
}
