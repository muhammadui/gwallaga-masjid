"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { t } from "@/i18n/en";
import { cn } from "@/lib/utils";

export interface CopyButtonProps {
  value: string;
  /** Accessible name, e.g. "Copy account number". */
  label: string;
  /** Visible text; defaults to "Copy". */
  children?: React.ReactNode;
  className?: string;
  variant?: "icon" | "pill";
}

/** Copies `value` to the clipboard with a quiet "Copied" confirmation (colour/opacity only). */
export function CopyButton({ value, label, children, className, variant = "icon" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Older Android WebViews: fall back to a hidden textarea.
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  }

  const Icon = copied ? Check : Copy;
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-full text-[0.8125rem] font-medium",
        "ring-1 ring-inset ring-line-strong transition-[background-color,color] duration-500 ease-[var(--ease-spring)]",
        "hover:bg-ink hover:text-limestone focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ring)",
        copied && "bg-ink text-limestone ring-ink",
        variant === "icon" ? "h-9 px-3.5" : "h-11 px-5",
        className,
      )}
    >
      <Icon aria-hidden size={14} strokeWidth={1.4} />
      <span aria-live="polite">{copied ? t.donate.transfer.copied : (children ?? t.donate.transfer.copy)}</span>
    </button>
  );
}
