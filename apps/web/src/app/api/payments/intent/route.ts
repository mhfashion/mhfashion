import { NextResponse } from "next/server";
import { createIntent } from "@/lib/payment-store";
import { findProvider, missingCredentials, paymentRef, type PaymentProviderId } from "@/lib/payments";
import { isMockAllowed } from "@/lib/payment-webhook";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: { orderId?: string; amountKs?: number; provider?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const orderId = String(payload.orderId ?? "").trim();
  const amountKs = Number(payload.amountKs);
  const requested = String(payload.provider ?? "").trim().toLowerCase();
  if (!orderId) return NextResponse.json({ error: "missing_order" }, { status: 400 });
  if (!Number.isFinite(amountKs) || amountKs <= 0) return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
  const provider = findProvider(requested);
  if (!provider) return NextResponse.json({ error: "unknown_provider" }, { status: 400 });

  // A provider without its credentials cannot take money. Fall back to the demo provider only when
  // mock is allowed, and say so in the response instead of pretending the real one ran.
  let active: PaymentProviderId = provider.id;
  let warning: string | null = null;
  if (provider.requires.length) {
    const missing = missingCredentials(provider.id, process.env);
    if (missing.length) {
      if (!isMockAllowed(process.env)) {
        return NextResponse.json({ error: "provider_not_configured", provider: provider.id, missing }, { status: 501 });
      }
      active = "mock";
      warning = `${provider.label} is not configured (${missing.join(", ")}); the demo provider stands in. Nothing is charged.`;
    }
  }

  const ref = paymentRef();
  const intent = createIntent({ ref, orderId, amountKs, provider: active });
  return NextResponse.json({
    ref: intent.ref,
    provider: active,
    requestedProvider: provider.id,
    amountKs: intent.amountKs,
    sandbox: active === "mock",
    warning,
  });
}
