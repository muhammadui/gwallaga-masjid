"use client";

import { useActionState } from "react";
import { t } from "@/i18n/en";
import { lookupBooking } from "@/actions/nikah-booking";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const l = t.nikah.lookup;

export function LookupForm({ initialRef }: { initialRef?: string }) {
  const [state, action, pending] = useActionState(lookupBooking, undefined);
  return (
    <form action={action} className="flex flex-col gap-6">
      <Field name="bookingRef" label={l.ref} required>
        <Input
          defaultValue={state?.values?.bookingRef ?? initialRef ?? ""}
          placeholder={l.refPlaceholder}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          className="font-mono uppercase tracking-wide"
        />
      </Field>
      <Field name="phoneLast4" label={l.phone} required>
        <Input inputMode="numeric" pattern="[0-9]{4}" maxLength={4} autoComplete="off" className="max-w-40 tabular-nums tracking-[0.3em]" />
      </Field>
      {state?.error ? (
        <p role="alert" className="rounded-xl bg-danger/[0.07] px-4 py-3 text-[0.875rem] text-danger">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" size="lg" icon disabled={pending} className="mt-2 self-start">
        {pending ? l.submitting : l.submit}
      </Button>
    </form>
  );
}
