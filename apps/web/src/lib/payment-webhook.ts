// The one place a provider callback is accepted. Both the public webhook route and the local
// "simulate" route go through `handlePaymentWebhook`, so the demo exercises the real verification
// path (signature, replay window, idempotency) instead of bypassing it.

import { getIntent, recordEvent } from "@/lib/payment-store";
import {
  MOCK_WEBHOOK_SECRET, SIGNATURE_HEADER, TIMESTAMP_HEADER, findProvider, parsePaymentEvent, signPayload,
  verifySignature, webhookSecret, type PaymentEvent, type PaymentProviderId,
} from "@/lib/payments";

export type WebhookResult = { status: number; body: Record<string, unknown> };

export async function handlePaymentWebhook(input: {
  provider: string;
  body: string;
  signature: string | null;
  timestamp: string | null;
  env: Record<string, string | undefined>;
  nowSeconds?: number;
}): Promise<WebhookResult> {
  const provider = findProvider(input.provider);
  if (!provider) return { status: 404, body: { error: "unknown_provider" } };

  const secret = webhookSecret(input.env);
  const check = await verifySignature({
    secret,
    timestamp: input.timestamp,
    signature: input.signature,
    body: input.body,
    nowSeconds: input.nowSeconds ?? Math.floor(Date.now() / 1000),
  });
  if (!check.ok) {
    return {
      status: check.reason === "stale_timestamp" ? 409 : 401,
      body: { error: check.reason },
    };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(input.body);
  } catch {
    return { status: 400, body: { error: "invalid_json" } };
  }
  const parsed = parsePaymentEvent(raw);
  if (!parsed.event) return { status: 400, body: { error: "invalid_event", issues: parsed.issues } };
  if (parsed.event.provider !== provider.id) return { status: 400, body: { error: "provider_mismatch" } };

  const intent = getIntent(parsed.event.ref);
  if (!intent) return { status: 404, body: { error: "unknown_ref" } };
  if (intent.amountKs !== parsed.event.amountKs) {
    return { status: 400, body: { error: "amount_mismatch", expected: intent.amountKs, received: parsed.event.amountKs } };
  }
  if (intent.orderId !== parsed.event.orderId) return { status: 400, body: { error: "order_mismatch" } };

  const recorded = recordEvent(parsed.event);
  if (recorded.duplicate) return { status: 200, body: { ok: true, duplicate: true, status: intent.status } };
  return { status: 200, body: { ok: true, duplicate: false, status: parsed.event.status, orderId: intent.orderId } };
}

/** Builds a signed callback body. Used by the local demo route; a real provider signs on its side. */
export async function buildSignedCallback(
  event: PaymentEvent,
  options: { env: Record<string, string | undefined>; nowSeconds?: number },
): Promise<{ body: string; signature: string; timestamp: string }> {
  const body = JSON.stringify(event);
  const timestamp = String(options.nowSeconds ?? Math.floor(Date.now() / 1000));
  const signature = await signPayload(webhookSecret(options.env), timestamp, body);
  return { body, signature, timestamp };
}

export const PAYMENT_WEBHOOK_HEADERS = { signature: SIGNATURE_HEADER, timestamp: TIMESTAMP_HEADER };

export function isMockAllowed(env: Record<string, string | undefined>): boolean {
  return env.PAYMENTS_ALLOW_MOCK !== "0";
}

export function mockSecret(): string {
  return MOCK_WEBHOOK_SECRET;
}

export type { PaymentProviderId };
