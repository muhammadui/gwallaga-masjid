import crypto from "node:crypto";
import {
  PaymentConfigError,
  PaymentGatewayError,
  type InitializeInput,
  type InitializeResult,
  type PaymentProvider,
  type VerifyResult,
} from "./provider";

/**
 * ServiceFabric (BillBuddy) adapter, modeled on ../wia/apps/web/lib/servicefabric.ts.
 *  - amounts are NAIRA on the wire (we convert from kobo);
 *  - every request is HMAC-SHA256 signed: timestamp + METHOD + fullPath + body;
 *  - checkout is a hosted redirect to `${PAYLINK}/${payref}`;
 *  - verify is BY payref (returned as `providerRef` from initialize);
 *  - webhook signature = HMAC-SHA256(timestamp + "." + rawBody, WEBHOOK_SECRET).
 *
 * Env: SERVICEFABRIC_BASE_URL, SERVICEFABRIC_PAYLINK_URL, SERVICEFABRIC_APP_ID,
 *      SERVICEFABRIC_APP_KEY, SERVICEFABRIC_WEBHOOK_SECRET,
 *      SERVICEFABRIC_FEE_BEARER ("customer" | "project", default "customer").
 */

const PREFIX = "/api";
const withScheme = (u: string) => (u && !/^https?:\/\//i.test(u) ? `https://${u}` : u);
const env = (k: string) => (process.env[k] ?? "").trim();
const BASE = () => withScheme(env("SERVICEFABRIC_BASE_URL").replace(/\/+$/, ""));
const PAYLINK = () => withScheme(env("SERVICEFABRIC_PAYLINK_URL").replace(/\/+$/, ""));
const APP_ID = () => env("SERVICEFABRIC_APP_ID");
const APP_KEY = () => env("SERVICEFABRIC_APP_KEY");
const WEBHOOK_SECRET = () => env("SERVICEFABRIC_WEBHOOK_SECRET");
const FEE_BEARER = () => (env("SERVICEFABRIC_FEE_BEARER") === "project" ? "project" : "customer");

export function isServiceFabricConfigured(): boolean {
  return Boolean(BASE() && PAYLINK() && APP_ID() && APP_KEY());
}

function assertConfigured() {
  if (!isServiceFabricConfigured()) {
    const missing = [
      ["SERVICEFABRIC_BASE_URL", BASE()],
      ["SERVICEFABRIC_PAYLINK_URL", PAYLINK()],
      ["SERVICEFABRIC_APP_ID", APP_ID()],
      ["SERVICEFABRIC_APP_KEY", APP_KEY()],
    ]
      .filter(([, v]) => !v)
      .map(([k]) => k);
    throw new PaymentConfigError(`ServiceFabric is not configured: missing ${missing.join(", ")}.`);
  }
}

function signedHeaders(method: string, fullPath: string, body: string): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = crypto
    .createHmac("sha256", APP_KEY())
    .update(timestamp + method.toUpperCase() + fullPath + body)
    .digest("hex");
  return {
    "X-App-ID": APP_ID(),
    "X-Timestamp": timestamp,
    "X-Signature": signature,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

/** Retries network errors, 5xx and 429 with ≥1s backoff (fresh signature each attempt). */
async function request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  assertConfigured();
  const fullPath = PREFIX + path;
  const bodyStr = body === undefined ? "" : JSON.stringify(body);
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(BASE() + fullPath, {
        method,
        headers: signedHeaders(method, fullPath, bodyStr),
        body: bodyStr === "" ? undefined : bodyStr,
        cache: "no-store",
      });
      const text = await res.text();
      let json: { data?: T; message?: string; error?: string } | null = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        // non-JSON body
      }
      if (res.ok) return (json?.data ?? json) as T;
      if ((res.status >= 500 || res.status === 429) && attempt < 3) {
        await new Promise((r) => setTimeout(r, 1200 * attempt));
        continue;
      }
      throw new PaymentGatewayError(
        `ServiceFabric ${res.status}: ${json?.message ?? json?.error ?? text.slice(0, 200)}`,
        res.status,
        json ?? text,
      );
    } catch (err) {
      lastErr = err;
      if (err instanceof TypeError && attempt < 3) {
        await new Promise((r) => setTimeout(r, 1200 * attempt));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

function splitName(name: string | undefined): [string, string] {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return ["Guest", "Donor"];
  if (parts.length === 1) return [parts[0], parts[0]];
  return [parts[0], parts.slice(1).join(" ")];
}

export const servicefabric: PaymentProvider & {
  verifyWebhookSignature: typeof verifyServiceFabricWebhook;
} = {
  id: "SERVICEFABRIC",

  async initialize(input: InitializeInput): Promise<InitializeResult> {
    if (input.plan) {
      throw new PaymentConfigError("ServiceFabric does not support recurring plans; use Paystack for monthly giving.");
    }
    const [first, last] = splitName(input.metadata.payerName);
    const p = await request<{ payref?: string }>("POST", "/payments/initialize", {
      order_id: input.reference,
      amount: Math.round(input.amountKobo / 100), // NAIRA on the wire
      currency: "NGN",
      fee_bearer: FEE_BEARER(),
      payer_first_name: first,
      payer_last_name: last,
      payer_email: input.email,
      payer_phone: input.metadata.payerPhone ?? "",
      metadata: {
        narration: input.metadata.narration ?? `Gwallaga Masjid ${input.metadata.kind} ${input.reference}`,
        ...input.metadata,
      },
      redirect_url: input.callbackUrl,
    });
    if (!p?.payref) throw new PaymentGatewayError("ServiceFabric initialize returned no payref", undefined, p);
    return { authorizationUrl: `${PAYLINK()}/${p.payref}`, providerRef: p.payref };
  },

  async verify(providerRef: string): Promise<VerifyResult> {
    const p = await request<{
      status?: string;
      value?: string | number;
      payment_date?: string;
      paid_at?: string;
      channel?: string;
    }>("GET", `/payments/${encodeURIComponent(providerRef)}/verify`);
    const naira = Number(p?.value ?? 0);
    const paidAt = p?.payment_date ?? p?.paid_at;
    const status = p?.status === "completed" ? "success" : p?.status === "failed" ? "failed" : "pending";
    return {
      status,
      amountKobo: Number.isFinite(naira) ? Math.round(naira * 100) : 0,
      channel: p?.channel,
      paidAt: paidAt ? new Date(paidAt) : undefined,
      raw: p,
    };
  },

  verifyWebhookSignature: verifyServiceFabricWebhook,
};

/** HMAC-SHA256(timestamp + "." + rawBody) with a 120s freshness window. */
export function verifyServiceFabricWebhook(
  rawBody: string,
  timestamp: string | null,
  signature: string | null,
  toleranceSeconds = 120,
): boolean {
  if (!WEBHOOK_SECRET() || !signature || !timestamp || !/^\d+$/.test(timestamp)) return false;
  if (toleranceSeconds > 0 && Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) > toleranceSeconds) {
    return false;
  }
  const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET())
    .update(timestamp + ".")
    .update(Buffer.from(rawBody, "utf8"))
    .digest("hex");
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(signature, "hex");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
