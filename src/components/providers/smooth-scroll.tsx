"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ReactLenis, type LenisRef } from "lenis/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type NetworkInformationLike = { saveData?: boolean; effectiveType?: string };

/** True when the visitor asked for less motion or less data. */
export function prefersLowMotion(): boolean {
  if (typeof window === "undefined") return true;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const connection = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
  const lowData = Boolean(connection?.saveData) || /(^|-)2g$/.test(connection?.effectiveType ?? "");
  return reduced || lowData;
}

/**
 * Lenis smooth scroll driven by gsap.ticker (one RAF loop for both), with
 * ScrollTrigger kept in sync. Skipped entirely for reduced motion / saveData,
 * in which case the page scrolls natively.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const lenisRef = useRef<LenisRef>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setEnabled(!prefersLowMotion());
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const lenis = lenisRef.current?.lenis;
    const tick = (time: number) => lenisRef.current?.lenis?.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    lenis?.on("scroll", ScrollTrigger.update);
    return () => {
      gsap.ticker.remove(tick);
      lenis?.off("scroll", ScrollTrigger.update);
    };
  }, [enabled]);

  if (!enabled) return <>{children}</>;

  return (
    <ReactLenis
      root
      ref={lenisRef}
      options={{ autoRaf: false, lerp: 0.09, smoothWheel: true, anchors: { offset: -96 } }}
    >
      {children}
    </ReactLenis>
  );
}
