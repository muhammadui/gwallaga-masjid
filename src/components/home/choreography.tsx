"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { prefersLowMotion } from "@/components/providers/smooth-scroll";
import { whenBrandReady } from "@/lib/preloader";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

/**
 * Motion for the home page shell. Server markup opts in with data attributes;
 * this wrapper wires them up once:
 *
 *   data-hero                 the pinned hero (sticky); content recedes as the strip rises
 *   data-hero-content         scaled / faded on scrub
 *   data-hero-split           headline: SplitText lines rise under a mask
 *   data-hero-reveal          hidden until the load sequence reaches it (CSS fallback)
 *   data-hero-star            star layer: 1° per 100px scrolled
 *   data-parallax="12"        image band layer drifts ±12% through the viewport
 *   data-tone-section         Minbar: limestone veil lifts to indigo, then returns
 *   data-reveal               fade-up once on entry
 *   [data-slot=eyebrow]       its hairline draws in from the left on entry
 *
 * The hero load sequence waits for the brand preloader ("gwallaga:ready")
 * when it is running, and starts immediately otherwise. While the indigo
 * Minbar section sits under the header, the header (only) gets
 * data-theme="dark".
 *
 * The prayer strip, countdown and forms are never touched here.
 * Under reduced motion / save-data everything is shown statically.
 */
export function Choreography({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = scope.current;
      if (!root) return;
      const q = <T extends Element = HTMLElement>(sel: string) => Array.from(root.querySelectorAll<T>(sel));
      const reveals = q("[data-hero-reveal]");
      const showStatic = () => {
        reveals.forEach((el) => {
          el.style.animation = "none";
          el.style.opacity = "1";
        });
      };

      if (prefersLowMotion()) {
        showStatic();
        return;
      }

      // ── 1. Load sequence (held until the preloader has gone) ────────────
      const headline = root.querySelector<HTMLElement>("[data-hero-split]");
      const others = reveals.filter((el) => el !== headline);
      const intro = gsap.timeline({ defaults: { ease: "expo.out" }, delay: 0.15, paused: true });
      let ready = false;
      let lineTween: gsap.core.Tween | null = null;

      if (headline) {
        SplitText.create(headline, {
          type: "lines",
          mask: "lines",
          linesClass: "hero-line",
          autoSplit: true,
          onSplit(self) {
            headline.style.animation = "none";
            gsap.set(headline, { opacity: 1 });
            lineTween = gsap.from(self.lines, {
              yPercent: 110,
              duration: 1.5,
              stagger: 0.12,
              ease: "expo.out",
              delay: 0.15,
              paused: !ready,
            });
            return lineTween;
          },
        });
      }
      others.forEach((el) => (el.style.animation = "none"));
      intro.fromTo(
        others,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 1.3, stagger: 0.1, clearProps: "transform" },
        0.75,
      );
      const stopWaiting = whenBrandReady(() => {
        ready = true;
        lineTween?.play();
        intro.play();
      });

      // ── 2. Star: 1° per 100px scrolled ──────────────────────────────────
      q("[data-hero-star]").forEach((star) => {
        gsap.to(star, {
          rotation: () => ScrollTrigger.maxScroll(window) / 100,
          ease: "none",
          scrollTrigger: {
            start: 0,
            end: "max",
            scrub: true,
            invalidateOnRefresh: true,
            onToggle: (st) => (star.style.willChange = st.isActive ? "transform" : ""),
          },
        });
      });

      // ── 3. Pinned hero yields to the prayer strip ───────────────────────
      const hero = root.querySelector<HTMLElement>("[data-hero]");
      const heroContent = root.querySelector<HTMLElement>("[data-hero-content]");
      if (hero && heroContent) {
        gsap.to(heroContent, {
          scale: 0.94,
          opacity: 0.25,
          yPercent: -4,
          ease: "none",
          scrollTrigger: {
            trigger: hero,
            start: "top top",
            end: "bottom top",
            scrub: true,
            onToggle: (st) => (heroContent.style.willChange = st.isActive ? "transform, opacity" : ""),
          },
        });
      }

      // ── 4. Parallax on image bands ──────────────────────────────────────
      q("[data-parallax]").forEach((layer) => {
        const amount = Number(layer.dataset.parallax) || 10;
        // Settle 1.05 -> 1 as the band enters (scale composes with the drift).
        gsap.fromTo(
          layer,
          { scale: 1.05 },
          {
            scale: 1,
            duration: 1.8,
            ease: "expo.out",
            scrollTrigger: { trigger: layer.parentElement ?? layer, start: "top 88%", once: true },
          },
        );
        gsap.fromTo(
          layer,
          { yPercent: -amount },
          {
            yPercent: amount,
            ease: "none",
            scrollTrigger: {
              trigger: layer.parentElement ?? layer,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
              onToggle: (st) => (layer.style.willChange = st.isActive ? "transform" : ""),
            },
          },
        );
      });

      // ── 5. Minbar colour shift: limestone → indigo → limestone ─────────
      const header = document.querySelector<HTMLElement>("[data-site-header]");
      q("[data-tone-section]").forEach((section) => {
        const veil = section.querySelector<HTMLElement>("[data-tone-veil]");
        const content = section.querySelector<HTMLElement>("[data-tone-content]");
        if (!veil || !content) return;
        const tone = gsap
          .timeline({
            defaults: { ease: "none" },
            scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: 0.6 },
          })
          .fromTo(veil, { opacity: 1 }, { opacity: 0, duration: 0.3 }, 0)
          .fromTo(content, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.2 }, 0.12)
          .to(content, { opacity: 0, duration: 0.15 }, 0.82)
          .to(veil, { opacity: 1, duration: 0.2 }, 0.8);

        // Header goes dark while indigo is under it: from the section's top
        // reaching the header until the veil starts returning (80% of the tone
        // timeline). Created after `tone`, so it refreshes after it.
        if (header) {
          const toneST = tone.scrollTrigger!;
          ScrollTrigger.create({
            trigger: section,
            start: "top top+=72",
            end: () => toneST.start + (toneST.end - toneST.start) * 0.8,
            onToggle: (st) => {
              if (st.isActive) header.setAttribute("data-theme", "dark");
              else header.removeAttribute("data-theme");
            },
          });
        }
      });

      // ── 6. Eyebrow hairlines draw in from the left ──────────────────────
      q("[data-slot=eyebrow]").forEach((eyebrow) => {
        const rule = eyebrow.querySelector<HTMLElement>(":scope > span[aria-hidden]");
        if (!rule) return;
        gsap.fromTo(
          rule,
          { scaleX: 0, transformOrigin: "left center" },
          {
            scaleX: 1,
            duration: 1.1,
            ease: "expo.out",
            delay: 0.15,
            scrollTrigger: { trigger: eyebrow, start: "top 90%", once: true },
          },
        );
      });

      // ── 7. Entry reveals ────────────────────────────────────────────────
      q("[data-reveal]").forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          y: 48,
          duration: 1.2,
          ease: "expo.out",
          clearProps: "transform,opacity",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
      });

      return () => {
        stopWaiting();
        header?.removeAttribute("data-theme");
      };
    },
    { scope },
  );

  return (
    <div ref={scope} className="w-full max-w-full overflow-x-clip">
      {children}
    </div>
  );
}
