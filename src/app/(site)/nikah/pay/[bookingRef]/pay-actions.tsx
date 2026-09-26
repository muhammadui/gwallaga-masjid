"use client";

import { useActionState, useState } from "react";
import { t } from "@/i18n/en";
import type { PayActionState } from "@/actions/nikah-booking";
import { Button } from "@/components/ui/button";

type Action = (prev: PayActionState) => Promise<PayActionState>;

function Note({ state }: { state: PayActionState }) {
  if (!state) return null;
  if (state.error)
    return (
      <p role="alert" className="mt-5 rounded-xl bg-clay/[0.08] px-4 py-3 text-[0.875rem] leading-relaxed text-fg">
        {state.error}
      </p>
    );
  if (state.notice)
    return (
      <p role="status" className="mt-5 rounded-xl bg-indigo/[0.06] px-4 py-3 text-[0.875rem] leading-relaxed">
        {state.notice}
      </p>
    );
  return null;
}

export function PayOnlineButton({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction}>
      <Button type="submit" size="lg" icon disabled={pending} className="w-full justify-between pl-7 sm:w-auto">
        {t.nikah.pay.onlineCta}
      </Button>
      <Note state={state} />
    </form>
  );
}

export function ActionButton({ action, label, variant = "secondary" }: { action: Action; label: string; variant?: "primary" | "secondary" }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction}>
      <Button type="submit" variant={variant} disabled={pending || !!state?.notice}>
        {label}
      </Button>
      <Note state={state} />
    </form>
  );
}

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          // clipboard blocked: the value is visible to copy by hand
        }
      }}
      className="h-8 rounded-full px-3 text-[0.75rem] ring-1 ring-inset ring-line-strong transition-colors duration-300 hover:bg-ink/[0.05]"
    >
      {copied ? t.buttons.copied : t.buttons.copy}
    </button>
  );
}
