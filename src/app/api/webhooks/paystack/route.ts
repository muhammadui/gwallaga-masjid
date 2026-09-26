import { verifyPaystackSignature } from "@/lib/payments/signature";
import { handlePaystackEvent, type PaystackEvent } from "@/lib/payments/webhook";

/**
 * Paystack webhook. Signature-verified over the RAW body. Returns 401 for a bad
 * signature; otherwise always 200 after logging (so Paystack doesn't retry
 * business-level no-ops). Infrastructure failures return 500 so Paystack
 * retries later, which is safe because handling is idempotent.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!verifyPaystackSignature(rawBody, signature)) {
    console.warn("[paystack-webhook] rejected: invalid signature");
    return Response.json({ ok: false }, { status: 401 });
  }

  let event: PaystackEvent;
  try {
    event = JSON.parse(rawBody) as PaystackEvent;
  } catch {
    console.warn("[paystack-webhook] ignored: body is not JSON");
    return Response.json({ ok: true, outcome: "ignored:bad_json" });
  }

  try {
    const result = await handlePaystackEvent(event);
    return Response.json({ ok: true, ...result });
  } catch (err) {
    console.error("[paystack-webhook] handler error", err);
    return Response.json({ ok: false }, { status: 500 });
  }
}
