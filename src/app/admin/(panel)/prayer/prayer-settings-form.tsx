"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { t } from "@/i18n/en";
import { savePrayerSettings } from "@/actions/prayer";
import { prayerSettingsSchema, type PrayerSettingsInput } from "@/lib/validation/prayer";
import {
  CALCULATION_METHODS,
  CALCULATION_METHOD_LABELS,
  PRAYER_NAMES,
  SALAH_KEYS,
  IQAMAH_OFFSET_FIELD,
  compassPoint,
  formatClock,
  getPrayerDay,
  type PrayerDay,
} from "@/lib/prayer";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const a = t.adminPrayer;

export function PrayerSettingsForm({ defaults }: { defaults: PrayerSettingsInput }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm<PrayerSettingsInput>({ resolver: zodResolver(prayerSettingsSchema), defaultValues: defaults, mode: "onChange" });

  const values = useWatch({ control });
  const [lastValid, setLastValid] = useState<PrayerSettingsInput>(defaults);
  const parsed = prayerSettingsSchema.safeParse(values);
  const previewInput = parsed.success ? parsed.data : lastValid;
  if (parsed.success && JSON.stringify(parsed.data) !== JSON.stringify(lastValid)) setLastValid(parsed.data);

  // Preview "today" is fixed at mount so the table is stable while editing.
  const [previewDate] = useState(() => new Date());
  const preview: PrayerDay = useMemo(
    () => getPrayerDay(previewDate, { ...previewInput, jumuahSecond: previewInput.jumuahSecond || null }),
    [previewDate, previewInput],
  );

  const onSubmit = handleSubmit((input) => {
    setFormError(null);
    startTransition(async () => {
      const res = await savePrayerSettings(input);
      if (res.ok) {
        toast.success(a.saved);
        reset(input);
        router.refresh();
        return;
      }
      setFormError(res.error);
      for (const [key, message] of Object.entries(res.fieldErrors ?? {})) {
        setError(key as keyof PrayerSettingsInput, { message });
      }
      toast.error(a.failed);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="mt-12 grid gap-12 xl:grid-cols-[minmax(0,1fr)_26rem]">
      <div className="flex flex-col gap-12">
        <fieldset>
          <legend className="text-eyebrow font-medium uppercase text-muted">{a.iqamahOffsets}</legend>
          <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
            {SALAH_KEYS.map((key) => {
              const name = IQAMAH_OFFSET_FIELD[key];
              return (
                <Field key={key} name={name} label={`${PRAYER_NAMES[key].en} (${a.minutes})`} error={errors[name]?.message}>
                  <Input type="number" inputMode="numeric" min={0} max={90} step={1} {...register(name, { valueAsNumber: true })} />
                </Field>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-eyebrow font-medium uppercase text-muted">{a.jumuah}</legend>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <Field name="jumuahFirst" label={a.jumuahFirst} error={errors.jumuahFirst?.message} required>
              <Input type="time" step={60} {...register("jumuahFirst")} />
            </Field>
            <Field name="jumuahSecond" label={a.jumuahSecond} hint={a.jumuahSecondHint} error={errors.jumuahSecond?.message}>
              <Input type="time" step={60} {...register("jumuahSecond")} />
            </Field>
          </div>
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="hijriOffsetDays" label={a.hijriOffset} hint={a.hijriOffsetHint} error={errors.hijriOffsetDays?.message}>
            <Select
              {...register("hijriOffsetDays", { valueAsNumber: true })}
              options={[
                { value: "-1", label: a.hijriOptions.minus },
                { value: "0", label: a.hijriOptions.zero },
                { value: "1", label: a.hijriOptions.plus },
              ]}
            />
          </Field>
          <Field name="calculationMethod" label={a.method} error={errors.calculationMethod?.message}>
            <Select
              {...register("calculationMethod")}
              options={CALCULATION_METHODS.map((m) => ({ value: m, label: CALCULATION_METHOD_LABELS[m] }))}
            />
          </Field>
        </div>

        {formError ? (
          <p role="alert" className="rounded-xl bg-danger/[0.07] px-4 py-3 text-[0.875rem] text-danger">
            {formError}
          </p>
        ) : null}

        <div>
          <Button type="submit" size="lg" icon disabled={pending || !isDirty}>
            {pending ? a.saving : a.save}
          </Button>
        </div>
      </div>

      <aside aria-labelledby="preview-title" className="self-start rounded-[var(--radius-panel)] bg-surface p-6 ring-1 ring-inset ring-line xl:sticky xl:top-8">
        <h2 id="preview-title" className="font-display text-display-sm">
          {a.preview}
        </h2>
        <p className="mt-1 text-[0.8125rem] text-muted">{a.previewHint}</p>
        <p className="mt-5 text-[0.9375rem]">
          {new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", weekday: "long", day: "numeric", month: "long" }).format(previewDate)}
          <span className="block text-muted">{preview.hijri.formatted}</span>
        </p>
        <table className="mt-5 w-full text-left tabular-nums" aria-live="polite">
          <thead>
            <tr className="text-eyebrow font-medium uppercase text-muted">
              <th scope="col" className="pb-2 font-medium">
                <span className="sr-only">{t.prayer.title}</span>
              </th>
              <th scope="col" className="pb-2 text-right font-medium">
                {t.prayer.adhan}
              </th>
              <th scope="col" className="pb-2 text-right font-medium">
                {t.prayer.iqamah}
              </th>
            </tr>
          </thead>
          <tbody>
            {preview.prayers.map((p) => (
              <tr key={p.key} className="hairline-t">
                <th scope="row" className={cn("py-2.5 font-normal", p.key === "sunrise" && "text-muted")}>
                  {p.nameEn}
                </th>
                <td className="py-2.5 text-right">{formatClock(p.adhan)}</td>
                <td className="py-2.5 text-right text-muted">{p.iqamah ? formatClock(p.iqamah) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="mt-5 grid grid-cols-2 gap-3 hairline-t pt-4 text-[0.875rem]">
          <dt className="text-muted">{t.prayer.jumuah}</dt>
          <dd className="text-right tabular-nums">
            {formatClock(preview.jumuah.first)}
            {preview.jumuah.second ? ` · ${formatClock(preview.jumuah.second)}` : ""}
          </dd>
          <dt className="text-muted">{t.prayer.qibla}</dt>
          <dd className="text-right tabular-nums">
            {Math.round(preview.qiblaDegrees)}° {compassPoint(preview.qiblaDegrees)}
          </dd>
        </dl>
      </aside>
    </form>
  );
}
