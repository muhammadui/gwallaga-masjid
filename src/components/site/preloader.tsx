"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { brand } from "@/i18n/brand.en";
import {
  PRELOADER_ATTR,
  PRELOADER_SESSION_KEY,
  READY_EVENT,
  motionDebugScale,
  preloaderActive,
} from "@/lib/preloader";
import { WordmarkGlyphs } from "./wordmark";

gsap.registerPlugin(useGSAP);

/** Budget (seconds). Draw + fill + exit must stay within 1.4s. */
const DRAW = 0.7;
const FILL = 0.2;
const EXIT = 0.5;
const MIN_GLYPH = 0.3;
/** On-screen stroke width of the draw-in, in CSS px. */
const STROKE_PX = 1.1;

/**
 * Once-per-session brand overlay. The page is server-rendered underneath from
 * the start; this fixed limestone layer only shows when the inline decision
 * script (see @/lib/preloader) set data-state="on" on it before first paint, so it never blocks HTML, never runs on admin routes, for reduced
 * motion or save-data. A CSS failsafe hides it if JS never arrives.
 *
 * Sequence: the stroke variant draws in glyph by glyph (reading order, right to
 * left) -> the fill cross-fades over it -> the mark flies (FLIP) onto the
 * header wordmark while the limestone wipes upward -> "gwallaga:ready".
 */
export function Preloader() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el || !preloaderActive()) return;
      try {
        sessionStorage.setItem(PRELOADER_SESSION_KEY, "1");
      } catch {
        /* private mode: fine, it just may run again */
      }
      // Hydration was slow enough that the CSS failsafe (3s) is about to fire
      // or already has: don't bring the overlay back, just hand over.
      const debugScale = motionDebugScale();
      if (debugScale === 1 && performance.now() > 2400) {
        el.setAttribute(PRELOADER_ATTR, "done");
        window.dispatchEvent(new CustomEvent(READY_EVENT));
        return;
      }
      el.style.animation = "none"; // JS owns it now; cancel the CSS failsafe
      gsap.globalTimeline.timeScale(debugScale);
      document.body.style.animation = "none";

      const ground = el.querySelector<HTMLElement>("[data-preloader-ground]")!;
      const edge = el.querySelector<HTMLElement>("[data-preloader-edge]")!;
      const mark = el.querySelector<HTMLElement>("[data-preloader-mark]")!;
      const strokeSvg = mark.querySelector<SVGSVGElement>("[data-variant=stroke]")!;
      const fillSvg = mark.querySelector<SVGSVGElement>("[data-variant=fill]")!;
      const strokes = Array.from(strokeSvg.querySelectorAll<SVGPathElement>("path.g"));
      const hint = el.querySelector<HTMLElement>("[data-preloader-hint]");

      // Keep the hairline constant on screen whatever the mark's size.
      const vbWidth = strokeSvg.viewBox.baseVal.width || 1;
      const rendered = strokeSvg.getBoundingClientRect().width || 1;
      strokeSvg.setAttribute("stroke-width", String((STROKE_PX * vbWidth) / rendered));
      strokes.forEach((p) => {
        const len = p.getTotalLength();
        p.style.strokeDasharray = `${len}`;
        p.style.strokeDashoffset = `${len}`;
      });

      strokeSvg.style.visibility = "visible";

      const n = strokes.length;
      const stagger = n > 1 ? Math.min(0.04, (DRAW - MIN_GLYPH) / (n - 1)) : 0;
      const each = DRAW - stagger * Math.max(n - 1, 0);

      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        el.setAttribute(PRELOADER_ATTR, "done");
        document.body.style.animation = "";
        window.dispatchEvent(new CustomEvent(READY_EVENT));
      };

      const tl = gsap.timeline({ onComplete: finish });
      tl.to(strokes, { strokeDashoffset: 0, duration: each, stagger, ease: "power2.inOut" }, 0)
        .to(fillSvg, { opacity: 1, duration: FILL, ease: "power1.out" }, DRAW)
        .to(strokeSvg, { opacity: 0, duration: FILL, ease: "power1.in" }, DRAW);
      if (hint) tl.to(hint, { opacity: 0, duration: 0.2 }, DRAW);

      // FLIP onto the header wordmark (measured now; the header is fixed).
      const exitAt = DRAW + FILL;
      const target = document.querySelector<SVGSVGElement>("[data-site-header] [data-wordmark-mark]");
      const to = target?.getBoundingClientRect();
      const from = mark.getBoundingClientRect();
      if (to && to.width > 0 && from.width > 0) {
        tl.to(
          mark,
          {
            x: to.left + to.width / 2 - (from.left + from.width / 2),
            y: to.top + to.height / 2 - (from.top + from.height / 2),
            scale: to.width / from.width,
            duration: EXIT,
            ease: "expo.out",
          },
          exitAt,
        );
      } else {
        tl.to(mark, { opacity: 0, scale: 0.5, duration: EXIT * 0.8, ease: "expo.out" }, exitAt);
      }
      // Limestone wipes upward, with a feathered leading edge riding along.
      const vh = window.innerHeight;
      tl.fromTo(
        ground,
        { clipPath: "inset(0% 0% 0% 0%)" },
        { clipPath: "inset(0% 0% 100% 0%)", duration: EXIT, ease: "expo.out" },
        exitAt,
      ).fromTo(edge, { y: 0 }, { y: -vh - edge.offsetHeight, duration: EXIT, ease: "expo.out" }, exitAt);

      // Skip on any key or click: jump to the end state.
      const skip = () => tl.progress(1);
      window.addEventListener("keydown", skip, { once: true });
      el.addEventListener("pointerdown", skip, { once: true });

      return () => {
        window.removeEventListener("keydown", skip);
        el.removeEventListener("pointerdown", skip);
        // useGSAP reverts the timeline. The overlay lives in the root layout, so
        // this only happens on a Strict Mode double-invoke, which re-runs it.
        tl.kill();
      };
    },
    { scope: root },
  );

  return (
    <div
      ref={root}
      data-preloader-root
      aria-hidden
      // The inline decision script sets data-state before hydration.
      suppressHydrationWarning
      className="preloader"
    >
      <div data-preloader-ground className="absolute inset-0 bg-limestone will-change-[clip-path]" />
      <div
        data-preloader-edge
        className="absolute inset-x-0 top-full h-[14vh] bg-gradient-to-b from-limestone to-transparent will-change-transform"
      />
      <div className="absolute inset-0 flex items-center justify-center px-(--gutter)">
        <div data-preloader-mark className="relative w-[min(78vw,36rem)] text-ink will-change-transform">
          <WordmarkGlyphs variant="stroke" data-variant="stroke" className="w-full" />
          <WordmarkGlyphs variant="fill" data-variant="fill" className="absolute inset-0 w-full opacity-0" />
        </div>
      </div>
      <span
        data-preloader-hint
        className="absolute inset-x-0 bottom-[max(2rem,env(safe-area-inset-bottom))] text-center font-sans text-eyebrow uppercase text-ink/45"
      >
        {brand.preloader.skip}
      </span>
    </div>
  );
}
