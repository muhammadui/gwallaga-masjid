"use client";

import { useActionState } from "react";
import { t } from "@/i18n/en";
import { saveBankAccount, saveCampaign, type AdminFormState } from "@/actions/donation";
import { DONATION_PURPOSES } from "@/lib/donations/giving";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const a = t.donate.admin;
const idle: AdminFormState = { status: "idle" };

function errs(state: AdminFormState) {
  return state.status === "error" ? state.fieldErrors : {};
}

/** After a failed submit React resets the form; re-seed it with what was typed. */
function typed(state: AdminFormState): Record<string, string> | null {
  return state.status === "error" ? (state.values ?? null) : null;
}

function Status({ state }: { state: AdminFormState }) {
  return (
    <p aria-live="polite" className="text-[0.8125rem] text-muted">
      {state.status === "ok" ? state.message : state.status === "error" ? (state.message ?? t.donate.form.genericError) : null}
    </p>
  );
}

function Checkbox({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-3 text-[0.875rem]">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-4 accent-[var(--color-indigo)]" />
      {label}
    </label>
  );
}

export interface CampaignFormValues {
  id: string;
  title: string;
  slug: string;
  description: string;
  targetKobo: number;
  purpose: string;
  sortOrder: number;
  active: boolean;
}

export function CampaignForm({ campaign }: { campaign?: CampaignFormValues }) {
  const [state, action, pending] = useActionState(saveCampaign, idle);
  const e = errs(state);
  const v = typed(state);
  const key = campaign?.id ?? "new";
  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2">
      {campaign ? <input type="hidden" name="id" value={campaign.id} /> : null}
      <Field name="title" id={`${key}-title`} label={a.campaignTitle} error={e.title} required className="sm:col-span-2">
        <Input defaultValue={v?.title ?? campaign?.title} maxLength={140} />
      </Field>
      <Field name="slug" id={`${key}-slug`} label={a.campaignSlug} hint={a.campaignSlugHint} error={e.slug}>
        <Input defaultValue={v?.slug ?? campaign?.slug} placeholder="ramadan-iftar-1448" pattern="[a-z0-9-]*" />
      </Field>
      <Field name="targetNaira" id={`${key}-target`} label={a.campaignTarget} error={e.targetNaira} required>
        <Input inputMode="numeric" defaultValue={v?.targetNaira ?? (campaign ? String(campaign.targetKobo / 100) : "")} placeholder="5000000" />
      </Field>
      <Field name="description" id={`${key}-description`} label={a.campaignDescription} error={e.description} required className="sm:col-span-2">
        <Textarea defaultValue={v?.description ?? campaign?.description} rows={3} maxLength={1200} />
      </Field>
      <Field name="purpose" id={`${key}-purpose`} label={a.campaignPurpose} error={e.purpose}>
        <Select defaultValue={v?.purpose ?? campaign?.purpose ?? "CAMPAIGN"} options={DONATION_PURPOSES.map((p) => ({ value: p, label: t.donate.purposes[p] }))} />
      </Field>
      <Field name="sortOrder" id={`${key}-sort`} label={a.campaignSortOrder} error={e.sortOrder}>
        <Input type="number" min={0} max={999} defaultValue={v?.sortOrder ?? campaign?.sortOrder ?? 0} />
      </Field>
      <div className="sm:col-span-2">
        <Checkbox name="active" label={a.campaignActive} defaultChecked={v ? v.active === "on" : campaign ? campaign.active : true} />
      </div>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <Button type="submit" size="sm" disabled={pending}>
          {campaign ? a.saveCampaign : a.createCampaign}
        </Button>
        <Status state={state} />
      </div>
    </form>
  );
}

export function BankAccountForm({ account }: { account: { bankName: string; accountName: string; accountNumber: string; active: boolean } | null }) {
  const [state, action, pending] = useActionState(saveBankAccount, idle);
  const e = errs(state);
  const v = typed(state);
  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2">
      <Field name="bankName" label={a.bankName} error={e.bankName} required>
        <Input defaultValue={v?.bankName ?? account?.bankName} placeholder="Jaiz Bank" />
      </Field>
      <Field name="accountNumber" label={a.accountNumber} error={e.accountNumber} required>
        <Input inputMode="numeric" defaultValue={v?.accountNumber ?? account?.accountNumber} maxLength={13} className="font-mono tracking-[0.04em]" />
      </Field>
      <Field name="accountName" label={a.accountName} error={e.accountName} required className="sm:col-span-2">
        <Input defaultValue={v?.accountName ?? account?.accountName} />
      </Field>
      <div className="sm:col-span-2">
        <Checkbox name="active" label={a.accountActive} defaultChecked={v ? v.active === "on" : account ? account.active : true} />
      </div>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <Button type="submit" size="sm" disabled={pending}>
          {a.saveBank}
        </Button>
        <Status state={state} />
      </div>
    </form>
  );
}
