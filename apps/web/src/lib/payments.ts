// Payments (Plan §8, P0 item 4). One provider interface, one signed webhook contract, and one
// idempotent transition into the order. Everything here is provider-agnostic and pure enough to run
// in the Worker, in a route handler and in a test.

import type { AdminOrder, AdminOrderStage } from "@/lib/admin-demo-data";

export type PaymentProviderId = "mock" | "kbzpay" | "wavepay" | "ayapay" | "visa";

export type PaymentProvider = {
  id: PaymentProviderId;
  label: string;
  /** Environment variables the provider cannot work without. */
  requires: string[];
  /** True for the local stand-in; it never moves money. */
  sandbox: boolean;
};

export const PAYMENT_PROVIDERS: PaymentProvider[] = [
  { id: "mock", label: "Demo provider", requires: [], sandbox: true },
  { id: "kbzpay", label: "KBZPay", requires: ["KBZPAY_APP_ID", "KBZPAY_SECRET", "PAYMENT_WEBHOOK_SECRET"], sandbox: false },
  { id: "wavepay", label: "Wave Pay", requires: ["WAVEPAY_MERCHANT_ID", "WAVEPAY_SECRET", "PAYMENT_WEBHOOK_SECRET"], sandbox: false },
  { id: "ayapay", label: "AYA Pay", requires: ["AYAPAY_MERCHANT_ID", "AYAPAY_SECRET", "PAYMENT_WEBHOOK_SECRET"], sandbox: false },
  { id: "visa", label: "Visa / Mastercard", requires: ["CARD_ACQUIRER_KEY", "PAYMENT_WEBHOOK_SECRET"], sandbox: false },
];

export const MOCK_WEBHOOK_SECRET = "mh-demo-webhook-secret";

export type PaymentIntent = {
  ref: string;
  orderId: string;
  amountKs: number;
  provider: PaymentProviderId;
  createdAt: string;
};

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export type PaymentEvent = {
  /** The provider's own event id — the idempotency key for the webhook. */
  id: string;
  ref: string;
  orderId: string;
  provider: PaymentProviderId;
  status: PaymentStatus;
  amountKs: number;
  occurredAt: string;
};

export const SIGNATURE_HEADER = "x-mh-signature";
export const TIMESTAMP_HEADER = "x-mh-timestamp";
/** A signed request older than this is refused, so a captured body cannot be replayed. */
export const SIGNATURE_TOLERANCE_SECONDS = 300;

export function findProvider(id: string): PaymentProvider | undefined {
  return PAYMENT_PROVIDERS.find((provider) => provider.id === id);
}

export function missingCredentials(id: PaymentProviderId, env: Record<string, string | undefined>): string[] {
  const provider = findProvider(id);
  if (!provider) return [`Unknown provider "${id}".`];
  return provider.requires.filter((name) => !env[name]);
}

export function webhookSecret(env: Record<string, string | undefined>): string {
  return env.PAYMENT_WEBHOOK_SECRET || MOCK_WEBHOOK_SECRET;
}

function hex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** HMAC-SHA256 over `${timestamp}.${body}` — the same shape Stripe and friends use. */
export async function signPayload(secret: string, timestamp: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${body}`));
  return hex(signature);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}

export type SignatureCheck =
  | { ok: true }
  | { ok: false; reason: "missing_signature" | "invalid_timestamp" | "stale_timestamp" | "bad_signature" };

export async function verifySignature(input: {
  secret: string;
  timestamp: string | null;
  signature: string | null;
  body: string;
  nowSeconds: number;
  toleranceSeconds?: number;
}): Promise<SignatureCheck> {
  if (!input.signature) return { ok: false, reason: "missing_signature" };
  const stamp = Number(input.timestamp);
  if (!input.timestamp || !Number.isFinite(stamp) || stamp <= 0) return { ok: false, reason: "invalid_timestamp" };
  const tolerance = input.toleranceSeconds ?? SIGNATURE_TOLERANCE_SECONDS;
  if (Math.abs(input.nowSeconds - stamp) > tolerance) return { ok: false, reason: "stale_timestamp" };
  const expected = await signPayload(input.secret, String(input.timestamp), input.body);
  return constantTimeEqual(expected, input.signature.trim().toLowerCase()) ? { ok: true } : { ok: false, reason: "bad_signature" };
}

export function parsePaymentEvent(raw: unknown): { event: PaymentEvent | null; issues: string[] } {
  const value = raw as Partial<PaymentEvent> | null;
  const issues: string[] = [];
  if (!value || typeof value !== "object") return { event: null, issues: ["The event body is not an object."] };
  if (!value.id) issues.push("The event has no id.");
  if (!value.ref) issues.push("The event has no payment reference.");
  if (!value.orderId) issues.push("The event has no order.");
  if (!findProvider(String(value.provider))) issues.push(`Unknown provider "${value.provider}".`);
  if (!["pending", "paid", "failed", "refunded"].includes(String(value.status))) issues.push(`Unknown status "${value.status}".`);
  if (!Number.isFinite(value.amountKs) || (value.amountKs ?? 0) <= 0) issues.push("The event amount must be positive.");
  if (!value.occurredAt || Number.isNaN(Date.parse(String(value.occurredAt)))) issues.push("The event has no valid timestamp.");
  if (issues.length) return { event: null, issues };
  return { event: value as PaymentEvent, issues: [] };
}

/** Where a paid order goes, and what it means for the stage it is already in. */
export function stageForPayment(status: PaymentStatus): AdminOrderStage | null {
  if (status === "paid") return "Confirmed";
  if (status === "failed") return "Cancelled";
  if (status === "refunded") return "Refunded";
  return null;
}

const PAID_STAGES: AdminOrderStage[] = ["Confirmed", "Processing", "Printing", "Ready to Ship", "Handed to Delivery", "Out for Delivery", "Delivered"];

/**
 * Applies one provider event to one order. Idempotent: replaying the same event changes nothing, and
 * a paid event never confirms an order twice, an amount mismatch never confirms at all, and a
 * refunded event never resurrects a cancelled order.
 */
export function applyPaymentEvent(order: AdminOrder, event: PaymentEvent): { order: AdminOrder; changed: boolean; issues: string[] } {
  if (event.orderId !== order.id) return { order, changed: false, issues: [`The event belongs to ${event.orderId}, not ${order.id}.`] };
  if (event.status === "paid") {
    if (order.stage !== "Pending Payment") {
      const already = PAID_STAGES.includes(order.stage);
      return { order, changed: false, issues: already ? [] : [`${order.id} is ${order.stage}; a payment cannot confirm it.`] };
    }
    return { order: { ...order, stage: "Confirmed" }, changed: true, issues: [] };
  }
  if (event.status === "failed") {
    if (order.stage !== "Pending Payment") return { order, changed: false, issues: [] };
    return { order: { ...order, stage: "Cancelled" }, changed: true, issues: [] };
  }
  if (event.status === "refunded") {
    if (order.stage === "Refunded") return { order, changed: false, issues: [] };
    return { order: { ...order, stage: "Refunded" }, changed: true, issues: [] };
  }
  return { order, changed: false, issues: [] };
}

/** The amount the provider must report back; anything else is a mismatch and never confirms. */
export function orderAmountKs(order: AdminOrder): number {
  return order.items.reduce((total, item) => total + item.unitPriceKs * item.quantity, 0);
}

export function amountsMatch(order: AdminOrder, event: PaymentEvent): boolean {
  return orderAmountKs(order) === event.amountKs;
}

export function paymentRef(now = Date.now(), random = Math.random): string {
  return `pi_${now.toString(36)}_${random().toString(36).slice(2, 10)}`;
}
