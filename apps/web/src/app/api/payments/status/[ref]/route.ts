import { NextResponse } from "next/server";
import { getIntent } from "@/lib/payment-store";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ ref: string }> }) {
  const limited = enforceRateLimit(request, "payments/status", RATE_LIMITS.paymentStatus);
  if (limited) return limited;
  const { ref } = await context.params;
  const intent = getIntent(ref);
  if (!intent) return NextResponse.json({ error: "unknown_ref" }, { status: 404 });
  return NextResponse.json({
    ref: intent.ref,
    orderId: intent.orderId,
    amountKs: intent.amountKs,
    provider: intent.provider,
    status: intent.status,
  });
}
