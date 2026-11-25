// Plan §16 P1-5: the delivery fee. `delivery.ts` builds the request MH Delivery prices a job from; this
// module sends it, and answers from the shop's own table when the courier is not reachable, so checkout
// can always show a fee. The table numbers are the shop's starting defaults, in one place, until MH
// Delivery confirms its own (Doc/MH-DELIVERY.md, "Still to confirm").
import type { DeliveryQuoteRequest } from "./delivery";

export type DeliveryQuote = {
  feeKs: number;
  service: string;
  etaDays: string;
  /** `courier` when MH Delivery answered, `table` when the shop's own numbers did. */
  source: "courier" | "table";
  weightGrams: number;
  /** Why the table was used, so the checkout can say it instead of hiding it. */
  note?: string;
};

export type DeliveryFeeBand = { firstKgKs: number; extraKgKs: number; etaDays: string };

export type DeliveryFeeTable = {
  /** Keyed by lower-case city name, the way the address form stores it. */
  cityFees: Record<string, DeliveryFeeBand>;
  defaultFee: DeliveryFeeBand;
  /** A subtotal at or above this ships free. */
  freeFromKs: number;
};

export const DELIVERY_FEE_TABLE: DeliveryFeeTable = {
  cityFees: {
    yangon: { firstKgKs: 2500, extraKgKs: 1000, etaDays: "1-2" },
    mandalay: { firstKgKs: 3500, extraKgKs: 1200, etaDays: "2-3" },
    "nay pyi taw": { firstKgKs: 3500, extraKgKs: 1200, etaDays: "2-3" },
    naypyidaw: { firstKgKs: 3500, extraKgKs: 1200, etaDays: "2-3" },
  },
  defaultFee: { firstKgKs: 4500, extraKgKs: 1500, etaDays: "3-5" },
  freeFromKs: 150_000,
};

export const DELIVERY_SERVICE_NAME = "MH Delivery · standard";

/** Couriers bill whole kilograms from the first one, so 900 g is one kilogram and 1.2 kg is two. */
export function billableWeightGrams(weightGrams: number): number {
  const grams = Number.isFinite(weightGrams) && weightGrams > 0 ? weightGrams : 0;
  return Math.max(1000, Math.ceil(grams / 1000) * 1000);
}

export function deliveryFeeBand(city: string, table: DeliveryFeeTable = DELIVERY_FEE_TABLE): DeliveryFeeBand {
  const key = city.trim().toLowerCase().replace(/\s+/g, " ");
  return table.cityFees[key] ?? table.defaultFee;
}

/** The shop's own fee: the first kilogram, then each started kilogram, free above the threshold. */
export function tableDeliveryQuote(
  input: { city: string; weightGrams: number; subtotalKs?: number },
  table: DeliveryFeeTable = DELIVERY_FEE_TABLE,
): DeliveryQuote {
  const band = deliveryFeeBand(input.city, table);
  const billable = billableWeightGrams(input.weightGrams);
  const extraKg = billable / 1000 - 1;
  const fee = band.firstKgKs + extraKg * band.extraKgKs;
  const free = typeof input.subtotalKs === "number" && input.subtotalKs >= table.freeFromKs;
  return {
    feeKs: free ? 0 : fee,
    service: DELIVERY_SERVICE_NAME,
    etaDays: band.etaDays,
    source: "table",
    weightGrams: billable,
    note: free ? "free delivery over the shop's threshold" : undefined,
  };
}

/** The weight a quote request asks the courier to bill. */
export function requestWeightGrams(request: Pick<DeliveryQuoteRequest, "parcels" | "totals">): number {
  const fromTotals = Number(request.totals?.weightGrams);
  if (Number.isFinite(fromTotals) && fromTotals > 0) return fromTotals;
  return (request.parcels ?? []).reduce((sum, parcel) => sum + (Number(parcel.weightGrams) || 0), 0);
}

export type CourierQuoteResult =
  | { ok: true; quote: DeliveryQuote }
  | { ok: false; reason: string };

export type CourierQuoteOptions = {
  endpoint?: string;
  token?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

function toFee(value: unknown): number | null {
  const fee = typeof value === "string" ? Number(value.replace(/[^0-9.-]/g, "")) : Number(value);
  return Number.isFinite(fee) && fee >= 0 ? Math.round(fee) : null;
}

/**
 * Ask MH Delivery for a fee. Never throws: a missing endpoint, a slow courier, a bad status or a body
 * without `feeKs` all come back as a reason, which is what lets checkout fall back to the table.
 */
export async function courierDeliveryQuote(
  request: DeliveryQuoteRequest,
  options: CourierQuoteOptions = {},
): Promise<CourierQuoteResult> {
  const endpoint = (options.endpoint ?? "").trim();
  if (!endpoint) return { ok: false, reason: "not_configured" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 8000);
  try {
    const response = await (options.fetchImpl ?? fetch)(`${endpoint.replace(/\/+$/, "")}/quote`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, reason: `http_${response.status}` };
    const body = (await response.json()) as { feeKs?: unknown; service?: unknown; etaDays?: unknown };
    const feeKs = toFee(body.feeKs);
    if (feeKs === null) return { ok: false, reason: "no_fee" };
    return {
      ok: true,
      quote: {
        feeKs,
        service: typeof body.service === "string" && body.service.trim() ? body.service.trim() : DELIVERY_SERVICE_NAME,
        etaDays: typeof body.etaDays === "string" && body.etaDays.trim() ? body.etaDays.trim() : "3-5",
        source: "courier",
        weightGrams: billableWeightGrams(requestWeightGrams(request)),
      },
    };
  } catch (error) {
    return { ok: false, reason: (error as Error)?.name === "AbortError" ? "timeout" : "unreachable" };
  } finally {
    clearTimeout(timeout);
  }
}

/** The courier's fee when it answers, the shop's table when it does not, and always a fee. */
export async function quoteDelivery(
  request: DeliveryQuoteRequest,
  options: CourierQuoteOptions & { table?: DeliveryFeeTable; subtotalKs?: number } = {},
): Promise<DeliveryQuote> {
  const courier = await courierDeliveryQuote(request, options);
  if (courier.ok) return courier.quote;
  const quote = tableDeliveryQuote(
    {
      city: request.consignee?.address?.city ?? "",
      weightGrams: requestWeightGrams(request),
      subtotalKs: options.subtotalKs,
    },
    options.table,
  );
  return { ...quote, note: quote.note ?? `the courier did not answer (${courier.reason}), so the shop's own table priced this` };
}
