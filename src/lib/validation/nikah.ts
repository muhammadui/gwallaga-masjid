import { z } from "zod";
import { nikah as dict } from "@/i18n/nikah.en";
import { HHMM_PATTERN, YMD_PATTERN } from "@/lib/nikah/time";

const e = dict.form.errors;

/** Nigerian mobile/landline in local (0803…) or international (+234 / 234) form. */
export const NG_PHONE_PATTERN = /^(?:\+?234|0)[789]\d{9}$/;

export function cleanPhone(input: string): string {
  return input.replace(/[\s\-().]/g, "");
}

export function isNigerianPhone(input: string): boolean {
  return NG_PHONE_PATTERN.test(cleanPhone(input));
}

/** Canonical +234XXXXXXXXXX. Assumes `isNigerianPhone(input)`. */
export function normalizePhone(input: string): string {
  const c = cleanPhone(input).replace(/^\+/, "");
  if (c.startsWith("234")) return `+${c}`;
  return `+234${c.slice(1)}`;
}

/** "+2348031234567" → "0803 123 4567" for display. */
export function displayPhone(phone: string): string {
  const local = phone.startsWith("+234") ? `0${phone.slice(4)}` : phone;
  return local.length === 11 ? `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}` : local;
}

const name = z.string().trim().min(3, e.name).max(120, e.name);
const phone = z.string().trim().refine(isNigerianPhone, e.phone);
const address = z.string().trim().min(5, e.required).max(300, e.required);
const age = z
  .number({ error: e.age })
  .int(e.age)
  .min(18, e.adult)
  .max(120, e.age);

export const WALI_RELATIONSHIPS = ["FATHER", "BROTHER", "UNCLE", "GRANDFATHER", "OTHER"] as const;
export const SADAKI_STATUSES = ["PAID", "DEFERRED", "PARTLY"] as const;

export const dateStepSchema = z.object({
  date: z.string().regex(YMD_PATTERN, e.date),
  time: z.string().regex(HHMM_PATTERN, e.slot),
  slotId: z.string().min(1, e.slot),
});

export const groomStepSchema = z.object({
  groomName: name,
  groomPhone: phone,
  groomEmail: z.string().trim().toLowerCase().email(e.email).max(200, e.email),
  groomAddress: address,
  groomAge: age,
});

export const brideStepSchema = z.object({
  brideName: name,
  bridePhone: phone,
  brideEmail: z.union([z.literal(""), z.string().trim().toLowerCase().email(e.email).max(200, e.email)]),
  brideAddress: address,
  brideAge: age,
  waliName: name,
  waliRelationship: z.enum(WALI_RELATIONSHIPS, { error: e.required }),
  waliRelationshipOther: z.string().trim().max(60),
  waliPhone: phone,
});

export const witnessStepSchema = z.object({
  witness1Name: name,
  witness1Phone: phone,
  witness2Name: name,
  witness2Phone: phone,
  sadakiAmount: z.number({ error: e.amount }).min(0, e.amount).max(1_000_000_000, e.amount),
  sadakiStatus: z.enum(SADAKI_STATUSES, { error: e.required }),
  notes: z.string().trim().max(1000),
});

export const reviewStepSchema = z.object({
  consent: z.literal(true, { error: e.consent }),
});

export const nikahBookingSchema = dateStepSchema
  .extend(groomStepSchema.shape)
  .extend(brideStepSchema.shape)
  .extend(witnessStepSchema.shape)
  .extend(reviewStepSchema.shape)
  .superRefine((v, ctx) => {
    if (v.waliRelationship === "OTHER" && v.waliRelationshipOther.trim().length < 2) {
      ctx.addIssue({ code: "custom", path: ["waliRelationshipOther"], message: e.required });
    }
    if (isNigerianPhone(v.witness1Phone) && isNigerianPhone(v.witness2Phone)) {
      if (normalizePhone(v.witness1Phone) === normalizePhone(v.witness2Phone)) {
        ctx.addIssue({ code: "custom", path: ["witness2Phone"], message: e.samePhone });
      }
    }
  });

export type NikahBookingInput = z.infer<typeof nikahBookingSchema>;

/** Field names per form step, for step-wise `trigger()`. */
export const STEP_FIELDS = [
  Object.keys(dateStepSchema.shape),
  Object.keys(groomStepSchema.shape),
  Object.keys(brideStepSchema.shape),
  Object.keys(witnessStepSchema.shape),
  Object.keys(reviewStepSchema.shape),
] as (keyof NikahBookingInput)[][];

export const lookupSchema = z.object({
  bookingRef: z.string().trim().min(6).max(20),
  phoneLast4: z.string().trim().regex(/^\d{4}$/),
});

// ─── Admin ──────────────────────────────────────────────────────────────────

export const proposeSlotSchema = z.object({
  bookingId: z.string().min(1),
  date: z.string().regex(YMD_PATTERN),
  time: z.string().regex(HHMM_PATTERN),
});

export const cancelSchema = z.object({
  bookingId: z.string().min(1),
  reason: z.string().trim().min(3).max(500),
});

export const solemnizeSchema = z.object({
  bookingId: z.string().min(1),
  officiantName: z.string().trim().min(3).max(120),
  waliConsent: z.literal(true),
  witnesses: z.literal(true),
  sadakiDeclared: z.literal(true),
  groomConsent: z.literal(true),
  brideConsent: z.literal(true),
  idsSighted: z.literal(true),
});

export const slotSchema = z.object({
  weekday: z.coerce.number().int().min(0).max(6),
  time: z.string().regex(HHMM_PATTERN),
  capacity: z.coerce.number().int().min(1).max(20),
});

export const feeSchema = z.object({
  feeNaira: z.coerce.number().int().min(0).max(10_000_000),
});
