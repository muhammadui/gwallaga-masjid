"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { t } from "@/i18n/en";
import {
  cancelBooking,
  confirmBooking,
  markTransferReceived,
  proposeSlot,
  regenerateCertificate,
  resendCertificate,
  revokeCertificate,
  solemnizeBooking,
  type AdminResult,
} from "@/actions/nikah";
import { CHECKLIST_KEYS, type ChecklistKey } from "@/lib/nikah/journal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const a = t.nikah.admin;

function useAdminAction() {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<AdminResult>, onOk?: () => void) =>
    start(async () => {
      try {
        const r = await fn();
        if (r.ok) {
          toast.success(r.message);
          onOk?.();
        } else toast.error(r.message);
      } catch {
        toast.error(t.nikah.form.errors.generic);
      }
    });
  return { pending, run };
}

export function ConfirmButton({ bookingId }: { bookingId: string }) {
  const { pending, run } = useAdminAction();
  return (
    <Button onClick={() => run(() => confirmBooking(bookingId))} disabled={pending} icon>
      {a.confirm}
    </Button>
  );
}

export function MarkReceivedButton({ paymentId }: { paymentId: string }) {
  const { pending, run } = useAdminAction();
  return (
    <Button size="sm" onClick={() => run(() => markTransferReceived(paymentId))} disabled={pending}>
      {a.markReceived}
    </Button>
  );
}

export function ProposeSlotForm({ bookingId, date, time }: { bookingId: string; date: string; time: string }) {
  const { pending, run } = useAdminAction();
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        {a.propose}
      </Button>
    );
  return (
    <form
      className="flex w-full flex-wrap items-end gap-3 rounded-2xl p-4 ring-1 ring-inset ring-line"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        run(() => proposeSlot({ bookingId, date: String(fd.get("date")), time: String(fd.get("time")) }), () => setOpen(false));
      }}
    >
      <Field name="date" label={a.proposeDate} required>
        <Input type="date" defaultValue={date} className="h-11" />
      </Field>
      <Field name="time" label={a.proposeTime} required>
        <Input type="time" defaultValue={time} step={300} className="h-11" />
      </Field>
      <Button type="submit" size="sm" disabled={pending}>
        {a.proposeSubmit}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
        {a.dismiss}
      </Button>
    </form>
  );
}

export function CancelForm({ bookingId }: { bookingId: string }) {
  const { pending, run } = useAdminAction();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  if (!open)
    return (
      <Button variant="ghost" className="text-danger" onClick={() => setOpen(true)}>
        {a.cancel}
      </Button>
    );
  return (
    <div className="w-full rounded-2xl bg-danger/[0.04] p-4 ring-1 ring-inset ring-danger/25">
      <Field name="cancelReason" label={a.cancelReason} required>
        <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          size="sm"
          className="bg-danger text-limestone"
          disabled={pending || reason.trim().length < 3}
          onClick={() => run(() => cancelBooking({ bookingId, reason }), () => setOpen(false))}
        >
          {a.cancelConfirm}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          {a.cancelKeep}
        </Button>
      </div>
    </div>
  );
}

export function SolemnizePanel({ bookingId, officiant, ready }: { bookingId: string; officiant: string; ready: boolean }) {
  const { pending, run } = useAdminAction();
  const [checked, setChecked] = useState<Record<ChecklistKey, boolean>>(
    () => Object.fromEntries(CHECKLIST_KEYS.map((k) => [k, false])) as Record<ChecklistKey, boolean>,
  );
  const [name, setName] = useState(officiant);
  const complete = CHECKLIST_KEYS.every((k) => checked[k]) && name.trim().length >= 3;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!complete) return;
        run(() => solemnizeBooking({ bookingId, officiantName: name, ...checked }));
      }}
    >
      <p className="text-[0.875rem] text-muted">{ready ? a.solemnizeLede : a.solemnizeNotReady}</p>
      <fieldset disabled={!ready || pending} className="mt-6 disabled:opacity-50">
        <legend className="sr-only">{a.verification}</legend>
        <ul className="grid gap-px overflow-hidden rounded-2xl bg-line ring-1 ring-line sm:grid-cols-2">
          {CHECKLIST_KEYS.map((k) => (
            <li key={k} className="bg-ground">
              <label className="flex cursor-pointer items-center gap-3 px-4 py-3.5 text-[0.9375rem]">
                <input
                  type="checkbox"
                  name={k}
                  checked={checked[k]}
                  onChange={(e) => setChecked((c) => ({ ...c, [k]: e.target.checked }))}
                  className="size-5 shrink-0 accent-[var(--color-indigo)]"
                />
                {a.checklist[k]}
              </label>
            </li>
          ))}
        </ul>
        <Field name="officiantName" label={a.officiant} required className="mt-6 max-w-md">
          <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </Field>
        {!complete ? <p className="mt-4 text-[0.8125rem] text-muted">{a.checklistIncomplete}</p> : null}
        <Button type="submit" size="lg" icon disabled={!complete || pending} className="mt-6">
          {pending ? a.solemnizing : a.solemnizeSubmit}
        </Button>
      </fieldset>
    </form>
  );
}

export function CertificateActions({ bookingId, revoked, canRevoke }: { bookingId: string; revoked: boolean; canRevoke: boolean }) {
  const { pending, run } = useAdminAction();
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <Button asChild size="sm" icon>
          <a href={`/admin/nikah/${bookingId}/certificate.pdf`} target="_blank" rel="noreferrer">
            {a.download}
          </a>
        </Button>
        {!revoked ? (
          <>
            <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => regenerateCertificate(bookingId))}>
              {a.regenerate}
            </Button>
            <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => resendCertificate(bookingId))}>
              {a.resend}
            </Button>
            {canRevoke && !confirming ? (
              <Button size="sm" variant="ghost" className="text-danger" onClick={() => setConfirming(true)}>
                {a.revoke}
              </Button>
            ) : null}
          </>
        ) : null}
      </div>
      {confirming && !revoked ? (
        <div role="alertdialog" aria-label={a.revoke} className="rounded-2xl bg-danger/[0.04] p-4 ring-1 ring-inset ring-danger/25">
          <p className="text-[0.875rem]">{a.revokeWarn}</p>
          <div className="mt-4 flex gap-3">
            <Button size="sm" className="bg-danger text-limestone" disabled={pending} onClick={() => run(() => revokeCertificate(bookingId), () => setConfirming(false))}>
              {a.revokeConfirm}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
              {a.dismiss}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
