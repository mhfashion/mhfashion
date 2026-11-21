import { NextResponse } from "next/server";
import { PAYMENT_WEBHOOK_HEADERS, handlePaymentWebhook } from "@/lib/payment-webhook";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  const body = await request.text();
  const result = await handlePaymentWebhook({
    provider,
    body,
    signature: request.headers.get(PAYMENT_WEBHOOK_HEADERS.signature),
    timestamp: request.headers.get(PAYMENT_WEBHOOK_HEADERS.timestamp),
    env: process.env,
  });
  return NextResponse.json(result.body, { status: result.status });
}
