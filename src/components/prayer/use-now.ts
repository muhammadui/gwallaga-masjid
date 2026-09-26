"use client";

import { useSyncExternalStore } from "react";

/*
 * One shared, second-aligned clock for every live prayer widget on the page.
 * The server snapshot is null so the first client render reproduces the
 * server HTML exactly (components fall back to a server-provided "now"),
 * then every subscriber ticks together.
 */
let current = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function tick() {
  current = Date.now();
  listeners.forEach((l) => l());
  timer = setTimeout(tick, 1000 - (Date.now() % 1000) + 8);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) timer = setTimeout(tick, 1000 - (Date.now() % 1000) + 8);
  const onVisible = () => {
    if (document.visibilityState === "visible") {
      current = Date.now();
      listeners.forEach((l) => l());
    }
  };
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    listeners.delete(listener);
    document.removeEventListener("visibilitychange", onVisible);
    if (listeners.size === 0 && timer) {
      clearTimeout(timer);
      timer = undefined;
    }
  };
}

function getSnapshot() {
  if (!current) current = Date.now();
  return current;
}

const getServerSnapshot = () => null;

/** Current epoch ms, updated each second; null during SSR and hydration. */
export function useNow(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
