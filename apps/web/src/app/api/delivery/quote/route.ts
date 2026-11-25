import { NextResponse } from "next/server";
import type { DeliveryQuoteRequest } from "@/lib/delivery";
import { quoteDelivery } from "@/lib/delivery-quote";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Plan §16 P1-5: MH Delivery prices the parcel; when it cannot be reached the shop's table answers. */
const ENDPOINT = process.env.MH_DELIVERY_URL ?? process.env.NEXT_PUBLIC_MH_DELIVERY_URL ?? "";
const TOKEN = process.env.MH_DELIVERY_TOKEN ?? "";

function isQuoteRequest(value: unknown): value is DeliveryQuoteRequest {
  if (!value || typeof value !== "object") return false;
  const request = value as Partial<DeliveryQuoteRequest>;
  const address = request.consignee?.address;
  return (
    typeof request.reference === "string" &&
    request.reference.trim().length > 0 &&
    typeof address?.city === "string" &&
    address.city.trim().length > 0 &&
    Array.isArray(request.parcels) &&
    request.parcels.length > 0 &&
    !!request.totals &&
    typeof request.totals === "object"
  );
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, "delivery/quote", RATE_LIMITS.deliveryQuote);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request", reason: "the body is not JSON" }, { status: 400 });
  }
  const payload = (body as { request?: unknown; subtotalKs?: unknown })?.request ?? body;
  const subtotalKs = (body as { subtotalKs?: unknown })?.subtotalKs;
  if (!isQuoteRequest(payload)) {
    return NextResponse.json(
      { error: "bad_request", reason: "send a quote request: reference, consignee.address.city and parcels" },
      { status: 400 },
    );
  }

  const quote = await quoteDelivery(payload, {
    endpoint: ENDPOINT,
    token: TOKEN,
    subtotalKs: typeof subtotalKs === "number" ? subtotalKs : undefined,
  });
  return NextResponse.json(quote, { headers: { "cache-control": "no-store" } });
}
