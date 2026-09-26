"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { t } from "@/i18n/en";
import { createNikahBooking, getAvailableSlots } from "@/actions/nikah-booking";
import type { SlotOption } from "@/lib/nikah/slots";
import { fill } from "@/lib/nikah/format";
import { formatLagosDate, lagosDateTime } from "@/lib/nikah/time";
import { cn, formatNaira } from "@/lib/utils";
import {
  cleanPhone,
  nikahBookingSchema,
  SADAKI_STATUSES,
  STEP_FIELDS,
  WALI_RELATIONSHIPS,
} from "@/lib/validation/nikah";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "./date-picker";

const f = t.nikah.form;
const STORAGE_KEY = "gjm-nikah-draft-v1";

type FormIn = z.input<typeof nikahBookingSchema>;
type FormOut = z.output<typeof nikahBookingSchema>;
type Name = FieldPath<FormIn>;

const EMPTY: Partial<FormIn> = {
  date: "",
  time: "",
  slotId: "",
  groomName: "",
  groomPhone: "",
  groomEmail: "",
  groomAddress: "",
  brideName: "",
  bridePhone: "",
  brideEmail: "",
  brideAddress: "",
  waliName: "",
  waliRelationshipOther: "",
  waliPhone: "",
  witness1Name: "",
  witness1Phone: "",
  witness2Name: "",
  witness2Phone: "",
  notes: "",
};

interface Draft {
  step: number;
  values: Partial<FormIn>;
}

function readDraft(): Draft | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Draft;
    return d && typeof d === "object" && d.values ? d : null;
  } catch {
    return null;
  }
}

function writeDraft(d: Draft) {
  try {
    // Never persist the consent tick: it must be given fresh.
    const { consent: _consent, ...values } = d.values;
    void _consent;
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ step: d.step, values }));
  } catch {
    // storage full or disabled: the form still works in memory
  }
}

function stepOf(name: string): number {
  const i = STEP_FIELDS.findIndex((fields) => (fields as string[]).includes(name));
  return i === -1 ? 0 : i;
}

export interface BookingFormProps {
  feeKobo: number;
  weekdays: number[];
  window: { min: string; max: string };
}

export function BookingForm({ feeKobo, weekdays, window: range }: BookingFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [slots, setSlots] = useState<SlotOption[] | null>(null);
  const [loadingSlots, startSlots] = useTransition();
  const [submitting, startSubmit] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const restored = useRef(false);
  // No draft writes until the saved draft (if any) has been restored.
  const ready = useRef(false);

  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(nikahBookingSchema),
    mode: "onTouched",
    defaultValues: EMPTY,
  });
  const { register, setValue, getValues, trigger, setError, clearErrors, reset, formState } = form;
  const errors = formState.errors;
  const err = (name: Name) => (errors[name]?.message as string | undefined) ?? null;

  const loadSlots = (ymd: string) => {
    startSlots(async () => {
      setSlots(await getAvailableSlots(ymd));
    });
  };

  // Restore a saved draft after hydration (sessionStorage is client-only).
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const draft = readDraft();
    if (!draft) {
      ready.current = true;
      return;
    }
    reset({ ...EMPTY, ...draft.values });
    const s = Math.min(Math.max(0, draft.step | 0), 3);
    // Deferred so the restored values commit first (and rAF may not fire in background tabs).
    setTimeout(() => {
      setStep(s);
      ready.current = true;
    }, 0);
    if (draft.values.date) loadSlots(draft.values.date);
  }, [reset]);

  // Persist every change.
  useEffect(() => {
    return form.subscribe({
      formState: { values: true },
      callback: ({ values }) => {
        if (ready.current) writeDraft({ step, values });
      },
    });
  }, [form, step]);

  useEffect(() => {
    if (ready.current) writeDraft({ step, values: getValues() });
  }, [step, getValues]);

  const goTo = (s: number) => {
    setStep(s);
    setFormError(null);
    requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: false }));
  };

  const next = async () => {
    const fields = STEP_FIELDS[step] as Name[];
    let valid = await trigger(fields, { shouldFocus: true });
    const v = getValues();
    if (step === 2 && v.waliRelationship === "OTHER" && (v.waliRelationshipOther ?? "").trim().length < 2) {
      setError("waliRelationshipOther", { message: f.errors.required }, { shouldFocus: true });
      valid = false;
    }
    if (step === 3 && v.witness1Phone && cleanPhone(v.witness1Phone).slice(-10) === cleanPhone(v.witness2Phone ?? "").slice(-10)) {
      setError("witness2Phone", { message: f.errors.samePhone }, { shouldFocus: true });
      valid = false;
    }
    if (valid) goTo(step + 1);
  };

  const submitValid = (values: FormOut) => {
    setFormError(null);
    startSubmit(async () => {
      const result = await createNikahBooking(values);
      if (result.ok) {
        try {
          window.sessionStorage.removeItem(STORAGE_KEY);
        } catch {}
        router.push(result.url);
        return;
      }
      setFormError(result.error);
      let target = result.step;
      for (const [name, message] of Object.entries(result.fieldErrors ?? {})) {
        setError(name as Name, { message });
        target = Math.min(target ?? 99, stepOf(name));
      }
      if (result.step === 0) {
        setValue("slotId", "");
        setValue("time", "");
        const date = getValues("date");
        if (date) loadSlots(date);
      }
      if (target !== undefined && target !== 99 && target !== step) goTo(target);
    });
  };

  const submitInvalid = (fieldErrors: object) => {
    const first = Object.keys(fieldErrors)[0];
    if (first && stepOf(first) !== step) goTo(stepOf(first));
  };

  const values = useWatch({ control: form.control }) as Partial<FormIn>;
  const selectedDate = values.date ?? "";
  const dateLabel = selectedDate ? formatLagosDate(lagosDateTime(selectedDate, "12:00")) : "";

  return (
    <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
      {/* Progress */}
      <aside className="lg:col-span-4">
        <div className="lg:sticky lg:top-[calc(var(--header-h)+2rem)]">
          <p className="text-eyebrow uppercase text-muted" aria-live="polite">
            {fill(f.stepOf, { n: step + 1, total: f.steps.length })}
          </p>
          <ol className="mt-6 flex gap-2 lg:flex-col lg:gap-0">
            {f.steps.map((label, i) => (
              <li key={label} className="flex-1 lg:flex-none">
                <button
                  type="button"
                  disabled={i > step || submitting}
                  onClick={() => goTo(i)}
                  aria-current={i === step ? "step" : undefined}
                  className={cn(
                    "group flex w-full flex-col gap-2 text-left transition-opacity duration-300 lg:flex-row lg:items-center lg:gap-4 lg:hairline-t lg:py-4",
                    i > step && "opacity-45",
                  )}
                >
                  <span className={cn("h-px w-full lg:hidden", i <= step ? "bg-accent" : "bg-line-strong")} />
                  <span
                    className={cn(
                      "hidden size-8 shrink-0 items-center justify-center rounded-full text-[0.8125rem] tabular-nums ring-1 ring-inset lg:inline-flex",
                      i === step ? "bg-accent text-accent-fg ring-transparent" : i < step ? "ring-(--hairline-gold) text-fg" : "ring-line-strong text-muted",
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className={cn("hidden text-[0.9375rem] lg:inline", i === step ? "font-medium" : "text-muted")}>{label}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </aside>

      {/* Step panel */}
      <div className="lg:col-span-8">
        <div className="rounded-[2rem] bg-ink/[0.04] p-1.5 ring-1 ring-line sm:p-2">
          <form
            onSubmit={(e) => {
              if (step < 4) {
                e.preventDefault();
                void next();
                return;
              }
              void form.handleSubmit(submitValid, submitInvalid)(e);
            }}
            noValidate
            className="rounded-[calc(2rem-0.375rem)] bg-surface px-5 py-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:rounded-[calc(2rem-0.5rem)] sm:px-10 sm:py-12"
          >
            <h2 ref={headingRef} tabIndex={-1} className="scroll-mt-[calc(var(--header-h)+2rem)] font-display text-display-sm outline-none">
              {[f.date.heading, f.groom.heading, f.bride.heading, f.witnesses.heading, f.review.heading][step]}
            </h2>

            {step === 0 ? (
              <div className="mt-8 flex flex-col gap-8">
                <p className="text-[0.9375rem] text-muted">{f.date.hint}</p>
                <DatePicker
                  value={selectedDate}
                  min={range.min}
                  max={range.max}
                  weekdays={weekdays}
                  invalid={!!errors.date}
                  onChange={(ymd) => {
                    setValue("date", ymd, { shouldValidate: true });
                    setValue("slotId", "");
                    setValue("time", "");
                    setSlots(null);
                    loadSlots(ymd);
                  }}
                />
                {errors.date ? (
                  <p role="alert" className="-mt-5 text-[0.8125rem] text-danger">
                    {err("date")}
                  </p>
                ) : null}
                <fieldset>
                  <legend className="text-[0.8125rem] font-medium">
                    {selectedDate ? fill(f.date.slotsFor, { date: dateLabel }) : f.date.pickDay}
                  </legend>
                  <div className="mt-4 min-h-12" aria-live="polite" aria-busy={loadingSlots}>
                    {!selectedDate ? null : loadingSlots || slots === null ? (
                      <p className="text-[0.9375rem] text-muted">{f.date.loading}</p>
                    ) : slots.length === 0 || slots.every((s) => !s.available) ? (
                      <p className="text-[0.9375rem] text-muted">{f.date.none}</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {slots.map((s) => {
                          const active = values.slotId === s.slotId;
                          return (
                            <button
                              key={s.slotId}
                              type="button"
                              disabled={!s.available}
                              aria-pressed={active}
                              onClick={() => {
                                setValue("slotId", s.slotId, { shouldValidate: true });
                                setValue("time", s.time, { shouldValidate: true });
                              }}
                              className={cn(
                                "h-12 min-w-24 rounded-full px-5 text-[0.9375rem] tabular-nums ring-1 ring-inset transition-colors duration-300",
                                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ring)",
                                active ? "bg-accent text-accent-fg ring-transparent" : "ring-line-strong hover:bg-ink/[0.05]",
                                !s.available && "line-through opacity-40",
                              )}
                            >
                              {s.label}
                              {!s.available ? <span className="sr-only"> ({f.date.taken})</span> : null}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {errors.slotId || errors.time ? (
                    <p role="alert" className="mt-3 text-[0.8125rem] text-danger">
                      {err("slotId") ?? err("time")}
                    </p>
                  ) : null}
                </fieldset>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="mt-8 grid gap-6 sm:grid-cols-2">
                <Field name="groomName" label={f.groom.name} error={err("groomName")} required className="sm:col-span-2">
                  <Input autoComplete="name" {...register("groomName")} />
                </Field>
                <Field name="groomPhone" label={f.groom.phone} error={err("groomPhone")} required>
                  <Input type="tel" inputMode="tel" autoComplete="tel" placeholder={f.placeholders.phone} {...register("groomPhone")} />
                </Field>
                <Field name="groomAge" label={f.groom.age} error={err("groomAge")} required>
                  <Input type="number" inputMode="numeric" min={18} max={120} {...register("groomAge", { valueAsNumber: true })} />
                </Field>
                <Field name="groomEmail" label={f.groom.email} hint={f.groom.emailHint} error={err("groomEmail")} required className="sm:col-span-2">
                  <Input type="email" inputMode="email" autoComplete="email" {...register("groomEmail")} />
                </Field>
                <Field name="groomAddress" label={f.groom.address} error={err("groomAddress")} required className="sm:col-span-2">
                  <Input autoComplete="street-address" {...register("groomAddress")} />
                </Field>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="mt-8 flex flex-col gap-12">
                <div className="grid gap-6 sm:grid-cols-2">
                  <Field name="brideName" label={f.bride.name} error={err("brideName")} required className="sm:col-span-2">
                    <Input {...register("brideName")} />
                  </Field>
                  <Field name="bridePhone" label={f.bride.phone} error={err("bridePhone")} required>
                    <Input type="tel" inputMode="tel" placeholder={f.placeholders.phone} {...register("bridePhone")} />
                  </Field>
                  <Field name="brideAge" label={f.bride.age} error={err("brideAge")} required>
                    <Input type="number" inputMode="numeric" min={18} max={120} {...register("brideAge", { valueAsNumber: true })} />
                  </Field>
                  <Field name="brideEmail" label={f.bride.email} hint={f.bride.emailHint} error={err("brideEmail")} className="sm:col-span-2">
                    <Input type="email" inputMode="email" {...register("brideEmail")} />
                  </Field>
                  <Field name="brideAddress" label={f.bride.address} error={err("brideAddress")} required className="sm:col-span-2">
                    <Input {...register("brideAddress")} />
                  </Field>
                </div>
                <div className="hairline-t pt-10">
                  <h3 className="font-display text-[1.375rem]">{f.wali.heading}</h3>
                  <p className="mt-2 text-[0.9375rem] text-muted">{f.wali.lede}</p>
                  <div className="mt-6 grid gap-6 sm:grid-cols-2">
                    <Field name="waliName" label={f.wali.name} error={err("waliName")} required className="sm:col-span-2">
                      <Input {...register("waliName")} />
                    </Field>
                    <Field name="waliRelationship" label={f.wali.relationship} error={err("waliRelationship")} required>
                      <Select
                        placeholder={f.placeholders.relationship}
                        options={WALI_RELATIONSHIPS.map((r) => ({ value: r, label: f.wali.relationships[r] }))}
                        {...register("waliRelationship", {
                          onChange: () => clearErrors("waliRelationshipOther"),
                        })}
                        defaultValue=""
                      />
                    </Field>
                    <Field name="waliPhone" label={f.wali.phone} error={err("waliPhone")} required>
                      <Input type="tel" inputMode="tel" placeholder={f.placeholders.phone} {...register("waliPhone")} />
                    </Field>
                    {values.waliRelationship === "OTHER" ? (
                      <Field name="waliRelationshipOther" label={f.wali.relationshipOther} error={err("waliRelationshipOther")} required className="sm:col-span-2">
                        <Input {...register("waliRelationshipOther")} />
                      </Field>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="mt-8 flex flex-col gap-12">
                <div>
                  <p className="text-[0.9375rem] text-muted">{f.witnesses.lede}</p>
                  {([1, 2] as const).map((n) => (
                    <div key={n} className="mt-6 grid gap-6 sm:grid-cols-2">
                      <p className="text-eyebrow uppercase text-muted sm:col-span-2">{fill(f.witnesses.witness, { n })}</p>
                      <Field name={`witness${n}Name`} label={f.witnesses.name} error={err(`witness${n}Name`)} required>
                        <Input {...register(`witness${n}Name`)} />
                      </Field>
                      <Field name={`witness${n}Phone`} label={f.witnesses.phone} error={err(`witness${n}Phone`)} required>
                        <Input type="tel" inputMode="tel" placeholder={f.placeholders.phone} {...register(`witness${n}Phone`)} />
                      </Field>
                    </div>
                  ))}
                </div>
                <div className="hairline-t pt-10">
                  <h3 className="font-display text-[1.375rem]">{f.sadaki.heading}</h3>
                  <p className="mt-2 text-[0.9375rem] text-muted">{f.sadaki.lede}</p>
                  <div className="mt-6 grid gap-6 sm:grid-cols-2">
                    <Field name="sadakiAmount" label={f.sadaki.amount} error={err("sadakiAmount")} required>
                      <Input type="number" inputMode="numeric" min={0} step={1} {...register("sadakiAmount", { valueAsNumber: true })} />
                    </Field>
                    <Field name="sadakiStatus" label={f.sadaki.status} error={err("sadakiStatus")} required>
                      <Select
                        placeholder={f.placeholders.sadakiStatus}
                        options={SADAKI_STATUSES.map((s) => ({ value: s, label: f.sadaki.statuses[s] }))}
                        {...register("sadakiStatus")}
                        defaultValue=""
                      />
                    </Field>
                    <Field name="notes" label={f.sadaki.notes} hint={f.sadaki.notesHint} error={err("notes")} className="sm:col-span-2">
                      <Textarea rows={3} {...register("notes")} />
                    </Field>
                  </div>
                </div>
              </div>
            ) : null}

            {step === 4 ? <Review values={values} feeKobo={feeKobo} dateLabel={dateLabel} onEdit={goTo} register={register} consentError={err("consent")} /> : null}

            {formError ? (
              <p role="alert" className="mt-8 rounded-xl bg-danger/[0.07] px-4 py-3 text-[0.875rem] text-danger">
                {formError}
              </p>
            ) : null}

            <div className="mt-12 flex items-center justify-between gap-4 hairline-t pt-8">
              {step > 0 ? (
                <Button type="button" variant="ghost" onClick={() => goTo(step - 1)} disabled={submitting}>
                  {f.back}
                </Button>
              ) : (
                <span />
              )}
              {step < 4 ? (
                <Button type="submit" icon>
                  {f.next}
                </Button>
              ) : (
                <Button type="submit" size="lg" icon disabled={submitting}>
                  {submitting ? f.submitting : f.submit}
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[11rem_1fr] sm:gap-6">
      <dt className="text-[0.8125rem] text-muted">{label}</dt>
      <dd className="text-[0.9375rem]">{children}</dd>
    </div>
  );
}

function ReviewBlock({ title, step, onEdit, children }: { title: string; step: number; onEdit: (s: number) => void; children: ReactNode }) {
  return (
    <section className="hairline-t py-6">
      <div className="flex items-baseline justify-between">
        <h3 className="text-eyebrow uppercase text-muted">{title}</h3>
        <button type="button" onClick={() => onEdit(step)} className="text-[0.8125rem] text-accent underline underline-offset-4">
          {f.review.edit}
        </button>
      </div>
      <dl className="mt-2">{children}</dl>
    </section>
  );
}

function Review({
  values: v,
  feeKobo,
  dateLabel,
  onEdit,
  register,
  consentError,
}: {
  values: Partial<FormIn>;
  feeKobo: number;
  dateLabel: string;
  onEdit: (s: number) => void;
  register: ReturnType<typeof useForm<FormIn, unknown, FormOut>>["register"];
  consentError: string | null;
}) {
  const rel = v.waliRelationship === "OTHER" ? v.waliRelationshipOther : v.waliRelationship ? f.wali.relationships[v.waliRelationship] : "";
  const sadaki = typeof v.sadakiAmount === "number" && !Number.isNaN(v.sadakiAmount) ? formatNaira(Math.round(v.sadakiAmount * 100)) : "";
  return (
    <div className="mt-6">
      <p className="text-[0.9375rem] text-muted">{f.review.lede}</p>
      <div className="mt-6">
        <ReviewBlock title={f.review.when} step={0} onEdit={onEdit}>
          <Row label={f.review.when}>
            {dateLabel} · {v.time}
          </Row>
        </ReviewBlock>
        <ReviewBlock title={f.groom.heading} step={1} onEdit={onEdit}>
          <Row label={f.groom.name}>{v.groomName}</Row>
          <Row label={f.groom.phone}>{v.groomPhone}</Row>
          <Row label={f.groom.email}>{v.groomEmail}</Row>
          <Row label={f.groom.address}>{v.groomAddress}</Row>
          <Row label={f.groom.age}>{v.groomAge}</Row>
        </ReviewBlock>
        <ReviewBlock title={f.steps[2]} step={2} onEdit={onEdit}>
          <Row label={f.bride.name}>{v.brideName}</Row>
          <Row label={f.bride.phone}>{v.bridePhone}</Row>
          {v.brideEmail ? <Row label={f.bride.email}>{v.brideEmail}</Row> : null}
          <Row label={f.bride.address}>{v.brideAddress}</Row>
          <Row label={f.bride.age}>{v.brideAge}</Row>
          <Row label={f.wali.heading}>
            {v.waliName} ({rel}) · {v.waliPhone}
          </Row>
        </ReviewBlock>
        <ReviewBlock title={f.steps[3]} step={3} onEdit={onEdit}>
          <Row label={fill(f.witnesses.witness, { n: 1 })}>
            {v.witness1Name} · {v.witness1Phone}
          </Row>
          <Row label={fill(f.witnesses.witness, { n: 2 })}>
            {v.witness2Name} · {v.witness2Phone}
          </Row>
          <Row label={f.sadaki.heading}>
            {sadaki}
            {v.sadakiStatus ? ` · ${f.sadaki.statuses[v.sadakiStatus]}` : ""}
          </Row>
          {v.notes ? <Row label={f.sadaki.notes}>{v.notes}</Row> : null}
        </ReviewBlock>
        <section className="hairline-y py-6">
          <div className="flex items-baseline justify-between gap-6">
            <h3 className="text-eyebrow uppercase text-muted">{f.review.fee}</h3>
            <p className="font-display text-display-sm tabular-nums">{formatNaira(feeKobo)}</p>
          </div>
          <p className="mt-2 text-[0.8125rem] text-muted">{f.review.feeNote}</p>
        </section>
      </div>
      <label className="mt-8 flex cursor-pointer items-start gap-4">
        <input
          type="checkbox"
          className="mt-0.5 size-5 shrink-0 accent-[var(--color-indigo)]"
          aria-invalid={consentError ? true : undefined}
          aria-describedby={consentError ? "consent-error" : undefined}
          {...register("consent")}
        />
        <span className="text-[0.9375rem] leading-relaxed">{f.review.consent}</span>
      </label>
      {consentError ? (
        <p id="consent-error" role="alert" className="mt-2 pl-9 text-[0.8125rem] text-danger">
          {consentError}
        </p>
      ) : null}
    </div>
  );
}
