// Local demo only: plays the provider's part by signing a callback and feeding it through the same
// verification path as a real webhook. Turned off with PAYMENTS_ALLOW_MOCK=0, which also makes the
// intent route refuse a provider that has no credentials instead of standing in for it.
import { NextResponse } from "next/server";
import { getIntent } from "@/lib/payment-store";
import { buildSignedCallback, handlePaymentWebhook, isMockAllowed } from "@/lib/payment-webhook";
import type { PaymentStatus } from "@/lib/payments";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "payments/simulate", RATE_LIMITS.paymentSimulate);
  if (limited) return limited;
  if (!isMockAllowed(process.env)) {
    return NextResponse.json({ error: "mock_disabled" }, { status: 403 });
  }
  let payload: { ref?: string; status?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const ref = String(payload.ref ?? "").trim();
  const intent = getIntent(ref);
  if (!intent) return NextResponse.json({ error: "unknown_ref" }, { status: 404 });
  if (intent.provider !== "mock") return NextResponse.json({ error: "not_a_mock_intent" }, { status: 400 });

  const status = (payload.status === "failed" ? "failed" : "paid") as PaymentStatus;
  const event = {
    id: `evt_${ref}_${status}_${Date.now().toString(36)}`,
    ref,
    orderId: intent.orderId,
    provider: "mock" as const,
    status,
    amountKs: intent.amountKs,
    occurredAt: new Date().toISOString(),
  };
  const signed = await buildSignedCallback(event, { env: process.env });
  const result = await handlePaymentWebhook({
    provider: "mock",
    body: signed.body,
    signature: signed.signature,
    timestamp: signed.timestamp,
    env: process.env,
  });
  return NextResponse.json({ ...result.body, eventId: event.id }, { status: result.status });
}
