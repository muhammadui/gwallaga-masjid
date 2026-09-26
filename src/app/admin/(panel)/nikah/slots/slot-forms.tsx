"use client";

import { useActionState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { t } from "@/i18n/en";
import { addSlot, deleteSlot, toggleSlot, updateNikahFee, type AdminResult } from "@/actions/nikah";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const s = t.nikah.admin.slots;

function useToast(state: AdminResult | undefined) {
  useEffect(() => {
    if (!state) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);
}

export function FeeForm({ feeNaira }: { feeNaira: number }) {
  const [state, action, pending] = useActionState(updateNikahFee, undefined);
  useToast(state);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <Field name="feeNaira" label={s.fee} required>
        <Input type="number" min={0} step={500} defaultValue={feeNaira} inputMode="numeric" className="w-48 tabular-nums" />
      </Field>
      <Button type="submit" disabled={pending}>
        {s.saveFee}
      </Button>
    </form>
  );
}

export function AddSlotForm() {
  const [state, action, pending] = useActionState(addSlot, undefined);
  useToast(state);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <Field name="weekday" label={s.weekday} required>
        <Select defaultValue="6" options={s.weekdays.map((label, i) => ({ value: String(i), label }))} className="w-44" />
      </Field>
      <Field name="time" label={s.time} required>
        <Input type="time" defaultValue="10:00" step={300} className="w-36" />
      </Field>
      <Field name="capacity" label={s.capacity} required>
        <Input type="number" min={1} max={20} defaultValue={1} className="w-28 tabular-nums" />
      </Field>
      <Button type="submit" disabled={pending}>
        {s.add}
      </Button>
    </form>
  );
}

export function SlotRowActions({ slotId, active }: { slotId: string; active: boolean }) {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<AdminResult>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) toast.success(r.message);
      else toast.error(r.message);
    });
  return (
    <div className="flex justify-end gap-2">
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => toggleSlot(slotId))}>
        {active ? s.pause : s.open}
      </Button>
      <Button size="sm" variant="ghost" className="text-danger" disabled={pending} onClick={() => run(() => deleteSlot(slotId))}>
        {s.delete}
      </Button>
    </div>
  );
}
