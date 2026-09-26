"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { ArrowUpRight, Landmark, Lock, X } from "lucide-react";
import { t } from "@/i18n/en";
import { cn, formatNaira } from "@/lib/utils";
import { feesToCoverKobo } from "@/lib/payments/fees";
import {
  AMOUNT_PRESETS_NAIRA,
  DEFAULT_AMOUNT_NAIRA,
  PURPOSE_TABS,
  nairaToKobo,
  parseNairaInput,
  perDayKobo,
  type DonationFrequencyValue,
  type DonationPurposeValue,
} from "@/lib/donations/giving";
import {
  bankTransferDonationSchema,
  fieldErrors as toFieldErrors,
  onlineDonationSchema,
  type DonationInput,
} from "@/lib/validation/donation";
import { startBankTransferDonation, startDonation, type DonateActionState } from "@/actions/donate";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const d = t.donate;
const f = d.form;

export interface DonateFormProps {
  initialPurpose: (typeof PURPOSE_TABS)[number];
  campaign: { slug: string; title: string } | null;
}

type Pending = "online" | "transfer" | null;

function Legend({ children }: { children: React.ReactNode }) {
  return <legend className="mb-3 text-eyebrow font-medium uppercase text-muted">{children}</legend>;
}

/** Pill-style toggle switch (role="switch"); animates colour only. */
function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
  hint?: React.ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-5">
      <div className="min-w-0">
        <label htmlFor={id} className="cursor-pointer text-[0.9375rem] font-medium">
          {label}
        </label>
        {hint ? <p className="mt-1 text-[0.8125rem] leading-snug text-muted">{hint}</p> : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-7 w-12 shrink-0 items-center rounded-full p-1 ring-1 ring-inset",
          "transition-colors duration-300 ease-[var(--ease-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ring)",
          checked ? "bg-indigo ring-indigo" : "bg-surface ring-line-strong",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "size-5 rounded-full shadow-[0_1px_2px_rgba(27,24,21,0.2)]",
            checked ? "ml-auto bg-limestone" : "bg-ink/70",
          )}
        />
      </button>
    </div>
  );
}

export function DonateForm({ initialPurpose, campaign: initialCampaign }: DonateFormProps) {
  const [campaign, setCampaign] = useState(initialCampaign);
  const [purpose, setPurpose] = useState<(typeof PURPOSE_TABS)[number]>(initialPurpose);
  const [frequency, setFrequency] = useState<DonationFrequencyValue>("ONE_OFF");
  const [preset, setPreset] = useState<number | null>(DEFAULT_AMOUNT_NAIRA);
  const [custom, setCustom] = useState("");
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [coverFees, setCoverFees] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<DonateActionState | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [, startTransition] = useTransition();

  const amountNaira = preset ?? parseNairaInput(custom) ?? 0;
  const netKobo = amountNaira >= 1 ? nairaToKobo(amountNaira) : 0;
  const feeKobo = useMemo(() => (netKobo > 0 ? feesToCoverKobo(netKobo) : 0), [netKobo]);
  const chargeKobo = netKobo + (coverFees ? feeKobo : 0);
  const dayKobo = perDayKobo(chargeKobo);
  const effectivePurpose: DonationPurposeValue = campaign ? "CAMPAIGN" : purpose;

  function buildInput(): DonationInput {
    return {
      purpose: effectivePurpose,
      campaignSlug: campaign?.slug,
      frequency,
      amountNaira: preset ?? custom,
      donorName,
      donorEmail,
      donorPhone,
      anonymous,
      coverFees,
    };
  }

  function run(kind: Exclude<Pending, null>) {
    const input = buildInput();
    const schema = kind === "online" ? onlineDonationSchema : bankTransferDonationSchema;
    const check = schema.safeParse(input);
    if (!check.success) {
      setErrors(toFieldErrors(check.error));
      setNotice(null);
      return;
    }
    setErrors({});
    setNotice(null);
    setPending(kind);
    startTransition(async () => {
      try {
        const result = await (kind === "online" ? startDonation(input) : startBankTransferDonation(input));
        // A successful action redirects; anything returned is a problem to show.
        if (result && result.status === "error") {
          setPending(null);
          setErrors(result.fieldErrors ?? {});
          setNotice(result);
          if (result.kind === "campaign") setCampaign(null);
        }
      } catch (e) {
        // redirect() is surfaced by the framework; only real failures land here.
        if (e && typeof e === "object" && "digest" in e && String((e as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")) throw e;
        setPending(null);
        setNotice({ status: "error", kind: "gateway", message: f.gatewayErrorBody });
      }
    });
  }

  const amountLabel = chargeKobo > 0 ? formatNaira(chargeKobo, { decimals: chargeKobo % 100 !== 0 }) : "";
  const giveLabel =
    chargeKobo > 0
      ? frequency === "MONTHLY"
        ? f.giveMonthlyButton(amountLabel)
        : f.giveButton(amountLabel)
      : f.giveButton("").trim();
  const blocked = notice?.status === "error" && notice.kind === "not_configured";

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        run("online");
      }}
      aria-describedby="give-notice"
      className="flex flex-col gap-9"
    >
      {/* Purpose */}
      <fieldset>
        <Legend>{f.purposeLegend}</Legend>
        {campaign ? (
          <div className="flex flex-col items-start gap-3 rounded-[1.25rem] bg-surface px-5 py-4 ring-1 ring-inset ring-line sm:flex-row sm:justify-between sm:gap-4">
            <div>
              <p className="text-[0.8125rem] text-muted">{f.campaignSelected}</p>
              <p className="mt-1 font-display text-[1.375rem] leading-tight">{campaign.title}</p>
            </div>
            <button
              type="button"
              onClick={() => setCampaign(null)}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[0.8125rem] text-muted ring-1 ring-inset ring-line-strong transition-colors duration-300 hover:text-fg"
            >
              <X aria-hidden size={13} strokeWidth={1.4} />
              {f.clearCampaign}
            </button>
          </div>
        ) : (
          <>
            <div role="radiogroup" aria-label={f.purposeLegend} className="-mx-1 flex flex-wrap gap-2 px-1">
              {PURPOSE_TABS.map((p) => {
                const active = p === purpose;
                return (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setPurpose(p)}
                    className={cn(
                      "h-10 rounded-full px-4 text-[0.875rem] ring-1 ring-inset transition-colors duration-300 ease-[var(--ease-soft)]",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ring)",
                      active ? "bg-ink text-limestone ring-ink" : "bg-transparent text-fg ring-line-strong hover:ring-(--fg)/40",
                    )}
                  >
                    {d.purposes[p]}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-[0.8125rem] leading-snug text-muted">{d.purposeHints[purpose]}</p>
          </>
        )}
        {errors.campaignSlug ? (
          <p role="alert" className="mt-2 text-[0.8125rem] text-danger">
            {errors.campaignSlug}
          </p>
        ) : null}
      </fieldset>

      {/* Frequency */}
      <fieldset>
        <Legend>{f.frequencyLegend}</Legend>
        <div role="radiogroup" aria-label={f.frequencyLegend} className="grid grid-cols-2 gap-1 rounded-full bg-ink/[0.05] p-1 ring-1 ring-inset ring-line">
          {(["ONE_OFF", "MONTHLY"] as const).map((fr) => {
            const active = fr === frequency;
            return (
              <button
                key={fr}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setFrequency(fr)}
                className={cn(
                  "h-10 rounded-full text-[0.875rem] font-medium transition-colors duration-300 ease-[var(--ease-soft)]",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ring)",
                  active ? "bg-surface text-fg shadow-[0_1px_2px_rgba(27,24,21,0.08),inset_0_1px_0_rgba(255,255,255,0.7)]" : "text-muted hover:text-fg",
                )}
              >
                {d.frequency[fr]}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Amount */}
      <fieldset>
        <Legend>{f.amountLegend}</Legend>
        <div role="radiogroup" aria-label={f.amountLegend} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {AMOUNT_PRESETS_NAIRA.map((n) => {
            const active = preset === n;
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  setPreset(n);
                  setCustom("");
                }}
                className={cn(
                  "h-14 rounded-[1rem] text-[1.0625rem] font-medium tabular-nums ring-1 ring-inset transition-colors duration-300 ease-[var(--ease-soft)]",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ring)",
                  active ? "bg-indigo text-limestone ring-indigo" : "bg-surface text-fg ring-line-strong hover:ring-(--fg)/40",
                )}
              >
                {formatNaira(n * 100)}
              </button>
            );
          })}
        </div>
        <div className="mt-3">
          <label htmlFor="field-customAmount" className="sr-only">
            {f.customAmount}
          </label>
          <div className="relative">
            <span aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[1.0625rem] text-muted">
              ₦
            </span>
            <Input
              id="field-customAmount"
              name="customAmount"
              inputMode="numeric"
              autoComplete="off"
              placeholder={`${f.customAmount}`}
              value={custom}
              aria-invalid={errors.amountNaira ? true : undefined}
              aria-describedby="amount-hint"
              onFocus={() => {
                if (preset !== null && !custom) setPreset(null);
              }}
              onChange={(e) => {
                const digits = e.target.value.replace(/[^\d]/g, "").slice(0, 9);
                setCustom(digits ? Number(digits).toLocaleString("en-NG") : "");
                setPreset(null);
              }}
              className="h-14 pl-9 text-[1.0625rem] tabular-nums"
            />
          </div>
          <p id="amount-hint" className={cn("mt-2 text-[0.8125rem] leading-snug", errors.amountNaira ? "text-danger" : "text-muted")} role={errors.amountNaira ? "alert" : undefined}>
            {errors.amountNaira ?? f.minAmountHint}
          </p>
          {frequency === "MONTHLY" && dayKobo > 0 ? (
            <p className="mt-3 font-display text-[1.125rem] italic leading-snug text-clay" aria-live="polite">
              {f.perDay(formatNaira(dayKobo))}
            </p>
          ) : null}
        </div>
      </fieldset>

      {/* Details */}
      <fieldset className="flex flex-col gap-5">
        <Legend>{f.detailsLegend}</Legend>
        <Field name="donorName" label={f.name} error={errors.donorName} required={!anonymous}>
          <Input autoComplete="name" value={donorName} onChange={(e) => setDonorName(e.target.value)} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="donorEmail" label={f.email} error={errors.donorEmail} hint={f.emailHint} required>
            <Input type="email" inputMode="email" autoComplete="email" value={donorEmail} onChange={(e) => setDonorEmail(e.target.value)} />
          </Field>
          <Field name="donorPhone" label={<>{f.phone} <span className="font-normal text-muted">({t.forms.optional.toLowerCase()})</span></>} error={errors.donorPhone}>
            <Input type="tel" inputMode="tel" autoComplete="tel" value={donorPhone} onChange={(e) => setDonorPhone(e.target.value)} />
          </Field>
        </div>
        <div className="flex flex-col gap-5 pt-2">
          <Toggle checked={anonymous} onChange={setAnonymous} label={f.anonymous} hint={f.anonymousHint} />
          <Toggle
            checked={coverFees}
            onChange={setCoverFees}
            label={<span className="tabular-nums">{f.coverFees(formatNaira(feeKobo, { decimals: feeKobo % 100 !== 0 }))}</span>}
            hint={f.coverFeesHint}
          />
        </div>
      </fieldset>

      {/* Notice */}
      <div id="give-notice" aria-live="polite">
        {notice?.status === "error" && notice.kind !== "validation" ? (
          <div className="rounded-[1.25rem] bg-surface px-5 py-4 ring-1 ring-inset ring-(--hairline-gold)">
            <p className="font-display text-[1.25rem] leading-snug">
              {notice.kind === "not_configured" ? f.notConfiguredTitle : notice.kind === "campaign" ? d.errors.campaignNotFound : f.gatewayErrorTitle}
            </p>
            {notice.kind !== "campaign" ? <p className="mt-2 text-[0.875rem] leading-relaxed text-muted">{notice.message}</p> : null}
          </div>
        ) : notice?.status === "error" ? (
          <p role="alert" className="text-[0.875rem] text-danger">
            {notice.message}
          </p>
        ) : null}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-4">
        {!blocked ? (
          <Button type="submit" size="lg" icon={<ArrowUpRight size={18} strokeWidth={1.4} />} disabled={pending !== null} className="w-full justify-between pl-7 tabular-nums">
            {pending === "online" ? f.processing : giveLabel}
          </Button>
        ) : null}
        <div className="flex items-center gap-4 text-eyebrow uppercase text-muted" aria-hidden={blocked}>
          {!blocked ? (
            <>
              <span className="h-px flex-1 bg-line" />
              {f.orDivider}
              <span className="h-px flex-1 bg-line" />
            </>
          ) : null}
        </div>
        <Button
          type="button"
          variant={blocked ? "primary" : "secondary"}
          size="lg"
          disabled={pending !== null}
          onClick={() => run("transfer")}
          icon={<Landmark size={17} strokeWidth={1.3} />}
          className="w-full justify-between pl-7"
        >
          {f.bankTransferButton}
        </Button>
        <p className="text-[0.8125rem] leading-snug text-muted">{f.bankTransferHint}</p>
        <p className="flex items-center gap-2 text-[0.75rem] text-muted">
          <Lock aria-hidden size={12} strokeWidth={1.4} />
          {d.hero.secure}
        </p>
      </div>
    </form>
  );
}
