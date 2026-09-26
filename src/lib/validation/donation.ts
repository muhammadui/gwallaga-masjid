import { z } from "zod";
import { donate } from "@/i18n/donate";
import {
  DONATION_FREQUENCIES,
  DONATION_PURPOSES,
  MAX_DONATION_NAIRA,
  MIN_DONATION_NAIRA,
  parseNairaInput,
} from "@/lib/donations/giving";

const e = donate.errors;
const ae = donate.admin.errors;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

/** Whole naira from a number or a typed string ("5,000"). */
const amountNaira = z
  .union([z.number(), z.string()])
  .transform((v, ctx) => {
    const n = typeof v === "number" ? v : parseNairaInput(v);
    if (n === null || !Number.isFinite(n)) {
      ctx.addIssue({ code: "custom", message: v === "" ? e.amountMin : e.amountWhole });
      return z.NEVER;
    }
    if (!Number.isInteger(n)) {
      ctx.addIssue({ code: "custom", message: e.amountWhole });
      return z.NEVER;
    }
    return n;
  })
  .pipe(z.number().min(MIN_DONATION_NAIRA, e.amountMin).max(MAX_DONATION_NAIRA, e.amountMax));

const phone = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => v === undefined || /^\+?[0-9][0-9 ()-]{6,19}$/.test(v), e.phoneInvalid);

const email = z
  .string()
  .trim()
  .toLowerCase()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => v === undefined || z.email().safeParse(v).success, e.emailInvalid);

const shape = {
  purpose: z.enum(DONATION_PURPOSES, { error: e.purposeInvalid }),
  campaignSlug: optionalText(120),
  frequency: z.enum(DONATION_FREQUENCIES).default("ONE_OFF"),
  amountNaira,
  donorName: optionalText(120),
  donorEmail: email,
  donorPhone: phone,
  anonymous: z.boolean().default(false),
  coverFees: z.boolean().default(false),
};

type Base = z.infer<z.ZodObject<typeof shape>>;

function refineCommon(v: Base, ctx: z.RefinementCtx) {
  if (v.purpose === "CAMPAIGN" && !v.campaignSlug) {
    ctx.addIssue({ code: "custom", path: ["campaignSlug"], message: e.campaignRequired });
  }
  if (!v.anonymous && (!v.donorName || v.donorName.length < 2)) {
    ctx.addIssue({ code: "custom", path: ["donorName"], message: e.nameRequired });
  }
}

/** Online (Paystack) gift: email is required because the gateway needs it. */
export const onlineDonationSchema = z.object(shape).superRefine((v, ctx) => {
  refineCommon(v, ctx);
  if (!v.donorEmail) ctx.addIssue({ code: "custom", path: ["donorEmail"], message: e.emailRequired });
});

/** Manual bank transfer: always one-off, no gateway fee; email optional (receipt only). */
export const bankTransferDonationSchema = z
  .object(shape)
  .superRefine(refineCommon)
  .transform((v) => ({ ...v, frequency: "ONE_OFF" as const, coverFees: false }));

export type DonationInput = z.input<typeof onlineDonationSchema>;
export type OnlineDonation = z.output<typeof onlineDonationSchema>;
export type BankTransferDonation = z.output<typeof bankTransferDonationSchema>;

/** Flatten zod issues to { field: firstMessage }. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? String(issue.path[0]) : "_form";
    out[key] ??= issue.message;
  }
  return out;
}

// ─── Admin ──────────────────────────────────────────────────────────────────

const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal(""), z.boolean()])
  .optional()
  .transform((v) => v === true || v === "on" || v === "true");

export const campaignSchema = z.object({
  id: optionalText(64),
  title: z.string().trim().min(3, ae.titleRequired).max(140),
  slug: optionalText(80).refine((v) => v === undefined || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v), ae.slugInvalid),
  description: z.string().trim().min(10, ae.descriptionRequired).max(1200),
  targetNaira: z.coerce.number({ error: ae.targetMin }).int(ae.targetMin).min(1_000, ae.targetMin).max(10_000_000_000),
  purpose: z.enum(DONATION_PURPOSES).default("CAMPAIGN"),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  active: checkbox,
});

export const bankAccountSchema = z.object({
  bankName: z.string().trim().min(2, ae.bankRequired).max(80),
  accountName: z.string().trim().min(2, ae.accountNameRequired).max(120),
  accountNumber: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s+/g, ""))
    .pipe(z.string().regex(/^\d{10}$/, ae.accountNumberInvalid)),
  active: checkbox,
});
