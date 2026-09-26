"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-render the receipt every few seconds (up to ~1 min) while the gateway confirms. */
export function RefreshWhilePending() {
  const router = useRouter();
  useEffect(() => {
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      router.refresh();
      if (n >= 12) clearInterval(id);
    }, 5000);
    return () => clearInterval(id);
  }, [router]);
  return null;
}
