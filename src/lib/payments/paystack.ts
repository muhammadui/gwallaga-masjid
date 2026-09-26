import {
  PaymentConfigError,
  PaymentGatewayError,
  type InitializeInput,
  type InitializeResult,
  type PaymentProvider,
  type VerifyResult,
  type VerifyStatus,
} from "./provider";
import { verifyPaystackSignature } from "./signature";

/**
 * Paystack adapter (https://paystack.com/docs/api). Amounts are already kobo.
 * Secrets are read at call time so builds never need them.
 */

const BASE_URL = "https://api.paystack.co";
export const PAYSTACK_CHANNELS = ["card", "bank", "ussd", "bank_transfer", "mobile_money"] as const;

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!key) {
    throw new PaymentConfigError(
      "Paystack is not configured: set PAYSTACK_SECRET_KEY (test key from dashboard.paystack.com → Settings → API Keys).",
    );
  }
  return key;
}

export function isPaystackConfigured(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY?.trim());
}

interface PaystackEnvelope<T> {
  status: boolean;
  message: string;
  data: T;
}

async function paystackRequest<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const text = await res.text();
  let json: PaystackEnvelope<T> | null = null;
  try {
    json = text ? (JSON.parse(text) as PaystackEnvelope<T>) : null;
  } catch {
    // non-JSON (gateway error page)
  }
  if (!res.ok || !json?.status) {
    throw new PaymentGatewayError(
      `Paystack ${method} ${path} failed (${res.status}): ${json?.message ?? text.slice(0, 200)}`,
      res.status,
      json ?? text,
    );
  }
  return json.data;
}

/** Raw shape of the parts of a Paystack transaction we use. */
export interface PaystackTransaction {
  id: number;
  status: "success" | "failed" | "abandoned" | "ongoing" | "pending" | "processing" | "queued" | "reversed";
  reference: string;
  amount: number;
  channel?: string;
  paid_at?: string | null;
  paidAt?: string | null;
  currency?: string;
  metadata?: unknown;
  customer?: { email?: string; customer_code?: string };
  plan?: { plan_code?: string } | string | null;
  authorization?: unknown;
}

export function mapPaystackStatus(status: string): VerifyStatus {
  if (status === "success") return "success";
  if (status === "failed" || status === "abandoned" || status === "reversed") return "failed";
  return "pending";
}

export const paystack: PaymentProvider & {
  createPlan: typeof createPlan;
  verifyWebhookSignature: typeof verifyWebhookSignature;
} = {
  id: "PAYSTACK",

  async initialize(input: InitializeInput): Promise<InitializeResult> {
    const data = await paystackRequest<{ authorization_url: string; access_code: string; reference: string }>(
      "POST",
      "/transaction/initialize",
      {
        amount: input.amountKobo,
        email: input.email,
        reference: input.reference,
        callback_url: input.callbackUrl,
        currency: "NGN",
        channels: PAYSTACK_CHANNELS,
        metadata: input.metadata,
        ...(input.plan ? { plan: input.plan } : {}),
      },
    );
    return { authorizationUrl: data.authorization_url, accessCode: data.access_code };
  },

  async verify(reference: string): Promise<VerifyResult> {
    const tx = await paystackRequest<PaystackTransaction>(
      "GET",
      `/transaction/verify/${encodeURIComponent(reference)}`,
    );
    const paidAt = tx.paid_at ?? tx.paidAt;
    return {
      status: mapPaystackStatus(tx.status),
      amountKobo: tx.amount,
      channel: tx.channel,
      paidAt: paidAt ? new Date(paidAt) : undefined,
      raw: tx,
    };
  },

  createPlan,
  verifyWebhookSignature,
};

/**
 * Get (or lazily create) a Paystack Plan for a recurring amount. Plans are
 * cached in the `PaystackPlan` table by (amountKobo, interval) so each amount
 * maps to exactly one plan. Returns the plan code to pass as `plan`.
 */
export async function createPlan(amountKobo: number, interval: "monthly" = "monthly"): Promise<string> {
  if (!Number.isInteger(amountKobo) || amountKobo < 10_000) {
    throw new RangeError("Plan amount must be an integer number of kobo ≥ ₦100");
  }
  const { prisma } = await import("@/lib/db");
  const cached = await prisma.paystackPlan.findUnique({
    where: { amountKobo_interval: { amountKobo, interval } },
  });
  if (cached) return cached.planCode;

  const naira = (amountKobo / 100).toLocaleString("en-NG");
  const plan = await paystackRequest<{ plan_code: string }>("POST", "/plan", {
    name: `Gwallaga Masjid monthly gift ₦${naira}`,
    amount: amountKobo,
    interval,
    currency: "NGN",
  });
  // Race-safe: if another request created it first, keep theirs.
  const row = await prisma.paystackPlan.upsert({
    where: { amountKobo_interval: { amountKobo, interval } },
    create: { amountKobo, interval, planCode: plan.plan_code },
    update: {},
  });
  return row.planCode;
}

/** HMAC-SHA512 check of the raw webhook body against PAYSTACK_SECRET_KEY. */
export function verifyWebhookSignature(rawBody: string | Buffer, header: string | null | undefined): boolean {
  return verifyPaystackSignature(rawBody, header);
}

/** Link a donor can use to manage (cancel) a subscription. */
export async function getSubscriptionManageLink(subscriptionCode: string): Promise<string> {
  const data = await paystackRequest<{ link: string }>(
    "GET",
    `/subscription/${encodeURIComponent(subscriptionCode)}/manage/link`,
  );
  return data.link;
}
