import { cn } from "@/lib/utils";
import { StarPattern } from "@/components/ui/star-pattern";

/**
 * Placeholder imagery band: slow limestone→sand drift, girih texture and a
 * single large 8-point star, on a parallax layer. Swap for next/image
 * photography of the building (keep the aspect ratio so nothing shifts).
 */
export function ImageBand({
  name,
  className,
  parallax = 10,
  tone = "clay",
}: {
  /** Stable placeholder id, e.g. "house-courtyard". */
  name: string;
  className?: string;
  parallax?: number;
  tone?: "clay" | "indigo";
}) {
  return (
    <figure
      data-placeholder={name}
      aria-hidden
      className={cn(
        "relative isolate overflow-hidden rounded-[var(--radius-panel)] bg-sand ring-1 ring-inset ring-ink/[0.06]",
        className,
      )}
    >
      <div data-parallax={parallax} className="absolute inset-x-0 -inset-y-[14%]">
        <div className="placeholder-drift absolute inset-0" />
        <StarPattern
          className={cn("absolute inset-0", tone === "clay" ? "text-clay" : "text-indigo")}
          opacity={0.22}
          size={96}
        />
        <svg
          viewBox="0 0 100 100"
          className={cn(
            "absolute left-1/2 top-1/2 w-[62%] max-w-[26rem] -translate-x-1/2 -translate-y-1/2",
            tone === "clay" ? "text-clay" : "text-indigo",
          )}
        >
          <g fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="0.35" vectorEffect="non-scaling-stroke">
            <rect x="21" y="21" width="58" height="58" />
            <rect x="21" y="21" width="58" height="58" transform="rotate(45 50 50)" />
            <circle cx="50" cy="50" r="18" />
            <circle cx="50" cy="50" r="41" strokeOpacity="0.18" />
          </g>
        </svg>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_120%,rgba(27,24,21,0.14),transparent_60%)]" />
    </figure>
  );
}
