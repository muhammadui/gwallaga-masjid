"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { compassPoint } from "@/lib/prayer/qibla";
import { t } from "@/i18n/en";
import { cn } from "@/lib/utils";

type OrientationEventCtor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};
type OrientationEventWithCompass = DeviceOrientationEvent & { webkitCompassHeading?: number };

const noop = () => () => {};
function supportsCompass() {
  return (
    typeof window !== "undefined" &&
    "DeviceOrientationEvent" in window &&
    window.matchMedia("(pointer: coarse)").matches
  );
}

/**
 * "Qibla 65° NE" chip with a small compass. Static bearing everywhere; on
 * phones that expose orientation (and after permission on iOS), the needle
 * turns live to point at the Ka'bah. Progressive: nothing breaks without it.
 */
export function QiblaCompass({ degrees, className }: { degrees: number; className?: string }) {
  const supported = useSyncExternalStore(noop, supportsCompass, () => false);
  const [live, setLive] = useState(false);
  const needle = useRef<SVGGElement>(null);
  const rounded = Math.round(degrees);

  const onOrientation = useCallback(
    (e: Event) => {
      const ev = e as OrientationEventWithCompass;
      let heading: number | null = null;
      if (typeof ev.webkitCompassHeading === "number") heading = ev.webkitCompassHeading;
      else if (ev.absolute && typeof ev.alpha === "number") heading = 360 - ev.alpha;
      if (heading === null || !needle.current) return;
      const screenAngle = window.screen.orientation?.angle ?? 0;
      needle.current.style.transform = `rotate(${degrees - heading - screenAngle}deg)`;
    },
    [degrees],
  );

  useEffect(() => {
    if (!live) return;
    const type = "ondeviceorientationabsolute" in window ? "deviceorientationabsolute" : "deviceorientation";
    window.addEventListener(type, onOrientation);
    return () => window.removeEventListener(type, onOrientation);
  }, [live, onOrientation]);

  const enable = async () => {
    const Ctor = window.DeviceOrientationEvent as OrientationEventCtor;
    try {
      if (typeof Ctor.requestPermission === "function") {
        if ((await Ctor.requestPermission()) !== "granted") return;
      }
      setLive(true);
    } catch {
      /* permission refused: stay static */
    }
  };

  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <svg viewBox="0 0 48 48" aria-hidden className="size-11 shrink-0 text-fg">
        <circle cx="24" cy="24" r="22.5" fill="none" stroke="currentColor" strokeOpacity="0.18" />
        {Array.from({ length: 8 }, (_, i) => (
          <line
            key={i}
            x1="24"
            y1="3.5"
            x2="24"
            y2={i % 2 ? "6" : "7.5"}
            stroke="currentColor"
            strokeOpacity={i === 0 ? 0.9 : 0.3}
            transform={`rotate(${i * 45} 24 24)`}
          />
        ))}
        <text x="24" y="14.5" textAnchor="middle" fontSize="5.5" fill="currentColor" fillOpacity="0.55" fontFamily="inherit">
          N
        </text>
        <g
          ref={needle}
          style={{ transform: `rotate(${degrees}deg)`, transformOrigin: "24px 24px", transformBox: "view-box" }}
          className="transition-transform duration-300 ease-[var(--ease-soft)]"
        >
          <path d="M24 9.5 L27 24 L24 22.4 L21 24 Z" className="fill-indigo" />
          <path d="M24 38.5 L27 24 L24 25.6 L21 24 Z" fill="currentColor" fillOpacity="0.2" />
          <rect x="22.2" y="7" width="3.6" height="3.6" transform="rotate(45 24 8.8)" className="fill-gold" />
        </g>
        <circle cx="24" cy="24" r="1.4" fill="currentColor" />
      </svg>
      <div className="leading-tight">
        <p className="text-[0.9375rem] font-medium tabular-nums">
          {t.prayer.qibla} {rounded}° {compassPoint(degrees)}
        </p>
        {supported ? (
          live ? (
            <p className="text-[0.8125rem] text-muted">{t.prayer.qiblaLive}</p>
          ) : (
            <button
              type="button"
              onClick={enable}
              className="text-[0.8125rem] text-accent underline decoration-line-strong underline-offset-4 hover:decoration-current"
            >
              {t.prayer.qiblaEnable}
            </button>
          )
        ) : (
          <p className="text-[0.8125rem] text-muted">{t.prayer.qiblaHint}</p>
        )}
      </div>
    </div>
  );
}
