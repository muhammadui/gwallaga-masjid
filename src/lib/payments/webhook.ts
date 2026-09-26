/**
 * Paystack webhook dispatcher. Pure logic over a small repository interface
 * so it can be unit-tested without a database; the Prisma-backed repository
 * lives in ./webhook-repo.ts and is loaded lazily by default.
 *
 * Idempotency: every state change goes through a repo method that only
 * transitions rows NOT already SUCCESS (conditional update), so Paystack's
 * retries and duplicate deliveries are no-ops.
 */

export type PaystackEvent =
  | { event: "charge.success"; data: PaystackChargeData }
  | { event: "subscription.create"; data: PaystackSubscriptionData }
  | { event: "subscription.disable" | "subscription.not_renew"; data: PaystackSubscriptionData }
  | { event: "invoice.payment_failed"; data: PaystackInvoiceData }
  | { event: string; data: Record<string, unknown> };

export interface PaystackChargeData {
  reference: string;
  amount: number;
  status?: string;
  channel?: string;
  paid_at?: string | null;
  paidAt?: string | null;
  metadata?: unknown;
  customer?: { email?: string };
  plan?: { plan_code?: string } | string | null;
  [key: string]: unknown;
}

export interface PaystackSubscriptionData {
  subscription_code: string;
  email_token?: string;
  status?: string;
  plan?: { plan_code?: string; amount?: number };
  customer?: { email?: string };
  [key: string]: unknown;
}

export interface PaystackInvoiceData {
  subscription?: { subscription_code?: string };
  [key: string]: unknown;
}

export interface SettleData {
  amountKobo: number;
  channel: string | null;
  paidAt: Date;
  raw: unknown;
}

export type SettleOutcome = "settled" | "duplicate" | "not_found";

export interface ExpectedPayment {
  /** Minimum kobo Paystack must report for this reference. */
  expectedKobo: number;
}

export interface RecurringParent {
  id: string;
  amountKobo: number;
  feesCoveredKobo: number;
}

export interface WebhookRepo {
  /** Expected charge for a nikah Payment reference, or null if unknown. */
  findNikahPayment(reference: string): Promise<ExpectedPayment | null>;
  /** Payment → SUCCESS and booking PENDING_PAYMENT/EXPIRED → PAID, atomically, only if not already SUCCESS. */
  settleNikah(reference: string, data: SettleData): Promise<SettleOutcome>;
  failNikah(reference: string, raw: unknown): Promise<void>;

  findDonation(reference: string): Promise<ExpectedPayment | null>;
  /** Donation → SUCCESS and Campaign.raisedKobo += amount, atomically, only if not already SUCCESS. */
  settleDonation(reference: string, data: SettleData): Promise<SettleOutcome>;
  failDonation(reference: string, raw: unknown): Promise<void>;

  /** Original monthly donation for a plan + donor email (recurring charges carry new references). */
  findRecurringParent(planCode: string, email: string): Promise<RecurringParent | null>;
  /** Insert a SUCCESS donation for a renewal (no-op returning "duplicate" if the reference exists). */
  createRecurringDonation(parentId: string, reference: string, data: SettleData): Promise<SettleOutcome>;

  attachSubscription(input: {
    planCode: string;
    email: string;
    subscriptionCode: string;
    emailToken?: string;
  }): Promise<boolean>;
  setSubscriptionActive(subscriptionCode: string, active: boolean): Promise<number>;
}

export interface WebhookResult {
  event: string;
  outcome: string;
}

function parseMetadata(meta: unknown): Record<string, unknown> {
  if (!meta) return {};
  if (typeof meta === "string") {
    try {
      const v = JSON.parse(meta);
      return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return typeof meta === "object" ? (meta as Record<string, unknown>) : {};
}

function planCodeOf(plan: PaystackChargeData["plan"]): string | undefined {
  if (!plan) return undefined;
  if (typeof plan === "string") return plan || undefined;
  return plan.plan_code || undefined;
}

let defaultRepo: Promise<WebhookRepo> | null = null;
function loadDefaultRepo(): Promise<WebhookRepo> {
  defaultRepo ??= import("./webhook-repo").then((m) => m.prismaWebhookRepo);
  return defaultRepo;
}

async function handleChargeSuccess(data: PaystackChargeData, repo: WebhookRepo): Promise<string> {
  const reference = data.reference;
  if (!reference) return "ignored:no_reference";
  const meta = parseMetadata(data.metadata);
  const kind = meta.kind;
  const paidAtRaw = data.paid_at ?? data.paidAt;
  const settle: SettleData = {
    amountKobo: data.amount,
    channel: data.channel ?? null,
    paidAt: paidAtRaw ? new Date(paidAtRaw) : new Date(),
    raw: data,
  };

  if (kind === "nikah") {
    const expected = await repo.findNikahPayment(reference);
    if (!expected) return "nikah:not_found";
    if (data.amount < expected.expectedKobo) {
      await repo.failNikah(reference, data);
      return "nikah:amount_mismatch";
    }
    return `nikah:${await repo.settleNikah(reference, settle)}`;
  }

  // Donations: one-off or first charge of a subscription carry our reference;
  // renewals carry a Paystack-generated one plus the plan code.
  const expected = await repo.findDonation(reference);
  if (expected) {
    if (data.amount < expected.expectedKobo) {
      await repo.failDonation(reference, data);
      return "donation:amount_mismatch";
    }
    return `donation:${await repo.settleDonation(reference, settle)}`;
  }

  const planCode = planCodeOf(data.plan);
  const email = data.customer?.email;
  if (planCode && email) {
    const parent = await repo.findRecurringParent(planCode, email);
    if (!parent) return "donation:renewal_parent_not_found";
    return `donation:renewal_${await repo.createRecurringDonation(parent.id, reference, settle)}`;
  }

  return kind === "donation" ? "donation:not_found" : "ignored:unknown_reference";
}

/**
 * Apply one Paystack event. Never throws for business-level problems (those
 * are reported in `outcome`); only infrastructure errors (DB down) propagate.
 */
export async function handlePaystackEvent(event: PaystackEvent, repo?: WebhookRepo): Promise<WebhookResult> {
  const r = repo ?? (await loadDefaultRepo());
  const name = event?.event ?? "unknown";
  let outcome: string;

  switch (name) {
    case "charge.success":
      outcome = await handleChargeSuccess(event.data as PaystackChargeData, r);
      break;
    case "subscription.create": {
      const d = event.data as PaystackSubscriptionData;
      const planCode = d.plan?.plan_code;
      const email = d.customer?.email;
      if (!d.subscription_code || !planCode || !email) {
        outcome = "ignored:incomplete_subscription";
        break;
      }
      const ok = await r.attachSubscription({
        planCode,
        email,
        subscriptionCode: d.subscription_code,
        emailToken: d.email_token,
      });
      outcome = ok ? "subscription:attached" : "subscription:no_matching_donation";
      break;
    }
    case "subscription.disable":
    case "subscription.not_renew": {
      const d = event.data as PaystackSubscriptionData;
      const n = d.subscription_code ? await r.setSubscriptionActive(d.subscription_code, false) : 0;
      outcome = `subscription:disabled(${n})`;
      break;
    }
    case "invoice.payment_failed": {
      const code = (event.data as PaystackInvoiceData).subscription?.subscription_code;
      outcome = `invoice:payment_failed${code ? `:${code}` : ""}`;
      break;
    }
    default:
      outcome = "ignored:unhandled_event";
  }

  console.info(`[paystack-webhook] ${name} → ${outcome}`);
  return { event: name, outcome };
}
