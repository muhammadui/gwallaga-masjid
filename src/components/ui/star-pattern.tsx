import { useId } from "react";
import { cn } from "@/lib/utils";

export interface StarPatternProps {
  className?: string;
  /** Tile size in px (the lattice repeat). */
  size?: number;
  /** Stroke opacity, 0–1. Keep low: this is texture, not decoration. */
  opacity?: number;
  strokeWidth?: number;
}

// One 100×100 tile: an 8-point star (two interlaced squares) at the centre and
// at each corner, joined by the girih strapwork that links neighbouring stars.
const R = 26; // star circumradius
const r = R * Math.SQRT1_2;
const star = (cx: number, cy: number) =>
  `M${cx - r} ${cy - r}H${cx + r}V${cy + r}H${cx - r}Z` +
  `M${cx} ${cy - R}L${cx + R} ${cy}L${cx} ${cy + R}L${cx - R} ${cy}Z`;
const TILE =
  [star(50, 50), star(0, 0), star(100, 0), star(0, 100), star(100, 100)].join("") +
  // strapwork: star tips to tile edges, and diagonals between corner stars
  `M50 ${50 - R}V0M50 ${50 + R}V100M${50 - R} 50H0M${50 + R} 50H100` +
  `M${50 - r} ${50 - r}L${r} ${r}M${50 + r} ${50 - r}L${100 - r} ${r}` +
  `M${50 - r} ${50 + r}L${r} ${100 - r}M${50 + r} ${50 + r}L${100 - r} ${100 - r}`;

/**
 * Low-contrast 8-point-star / girih tessellation for background texture.
 * Inherits `currentColor`; position it absolutely inside a relative parent.
 * Marked data-placeholder: swap for photography when it exists.
 *
 *   <StarPattern className="absolute inset-0 text-clay" opacity={0.12} />
 */
export function StarPattern({ className, size = 120, opacity = 0.14, strokeWidth = 0.6 }: StarPatternProps) {
  const id = `girih-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
  return (
    <svg
      aria-hidden
      data-placeholder="star-pattern"
      className={cn("pointer-events-none select-none", className)}
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse" viewBox="0 0 100 100">
          <path
            d={TILE}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeOpacity={opacity}
            vectorEffect="non-scaling-stroke"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
