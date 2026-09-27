"use client";

import { useEffect } from "react";
import { useLenis } from "lenis/react";
import { READY_EVENT, preloaderActive } from "@/lib/preloader";

/**
 * Holds Lenis still while the preloader overlay is up and restarts it when the
 * overlay has gone. Renders nothing; mount inside <SmoothScroll>.
 */
export function LenisGate() {
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis || !preloaderActive()) return;
    lenis.stop();
    const release = () => lenis.start();
    window.addEventListener(READY_EVENT, release, { once: true });
    return () => {
      window.removeEventListener(READY_EVENT, release);
      lenis.start();
    };
  }, [lenis]);

  return null;
}
