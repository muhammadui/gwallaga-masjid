"use client";

import { useActionState } from "react";
import { t } from "@/i18n/en";
import { emailManageLink, type ManageLinkState } from "@/actions/donate";
import { Button } from "@/components/ui/button";

export function ManageSubscription({ reference }: { reference: string }) {
  const [state, action, pending] = useActionState<ManageLinkState, FormData>(
    (prev) => emailManageLink(reference, prev),
    { status: "idle" },
  );
  const ty = t.donate.thankYou;
  return (
    <form action={action} className="flex flex-col items-start gap-3">
      {state.status !== "sent" ? (
        <Button type="submit" variant="ghost" size="sm" disabled={pending} className="-ml-4 underline decoration-(--hairline-gold) underline-offset-4">
          {ty.manageSubscription}
        </Button>
      ) : null}
      <p aria-live="polite" className="text-[0.8125rem] text-muted">
        {state.status === "sent" ? ty.manageSent : state.status === "failed" ? ty.manageFailed : null}
      </p>
    </form>
  );
}
