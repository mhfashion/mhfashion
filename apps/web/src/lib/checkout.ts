// Checkout (Plan §8): turn the cart into an order once, even if the button is pressed twice.
// The idempotency key is the contract — a retry returns the order the first attempt created.

import type { CartItem } from "@/lib/cart-items";
import { type AdminDemoData, type AdminOrder, type AdminOrderItem, type AdminPaymentMethod } from "@/lib/admin-demo-data";
import { applyPaymentEvent, orderAmountKs, type PaymentEvent, type PaymentProviderId, type PaymentStatus } from "@/lib/payments";
import { awardPurchase, reversePurchase } from "@/lib/loyalty-ledger";
import { syncStockWithStage } from "@/lib/stock-movement";

/** Plan §8: Visa plus the three wallets. There is no cash on delivery. */
export const CHECKOUT_PAYMENTS: { id: CheckoutPayment; label: string; hint: string }[] = [
  { id: "KBZPay", label: "KBZPay", hint: "Scan the QR in the app" },
  { id: "WavePay", label: "Wave Pay", hint: "Pay from the Wave Money app" },
  { id: "AYAPay", label: "AYA Pay", hint: "Pay from the AYA app" },
  { id: "Visa", label: "Visa / Mastercard", hint: "International card" },
];

export type CheckoutPayment = Extract<AdminPaymentMethod, "KBZPay" | "WavePay" | "AYAPay" | "Visa">;

export type CheckoutAddress = {
  name: string;
  phone: string;
  address: string;
  township: string;
  city: string;
};

export type CheckoutDraft = {
  /** One per checkout attempt; the same key never creates a second order. */
  idempotencyKey: string;
  items: CartItem[];
  address: CheckoutAddress;
  payment: CheckoutPayment;
  note?: string;
  placedAt: string;
};

export const EMPTY_ADDRESS: CheckoutAddress = { name: "", phone: "", address: "", township: "", city: "" };

export const CHECKOUT_CITIES = ["Yangon", "Mandalay", "Nay Pyi Taw", "Taunggyi", "Mawlamyine", "Other"];

export function lineTotalKs(item: CartItem): number {
  return (item.unitPriceKs ?? item.priceMinKs ?? 0) * Math.max(1, item.quantity);
}

export function checkoutSubtotalKs(items: readonly CartItem[]): number {
  return items.reduce((total, item) => total + lineTotalKs(item), 0);
}

export function checkoutUnits(items: readonly CartItem[]): number {
  return items.reduce((total, item) => total + Math.max(1, item.quantity), 0);
}

function digitsOnly(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

export type CheckoutAddressIssue = { [K in keyof CheckoutAddress | "note"]?: string };

/** Per-field messages, so a field can point at its own problem instead of only the summary list. */
export function checkoutAddressIssues(address: CheckoutAddress, note?: string): CheckoutAddressIssue {
  const issues: CheckoutAddressIssue = {};
  if (!address.name.trim()) issues.name = "Enter the recipient's name.";
  const phoneDigits = digitsOnly(address.phone);
  if (!phoneDigits) issues.phone = "Enter a phone number — the courier calls it.";
  else if (phoneDigits.length < 7 || phoneDigits.length > 15) issues.phone = "That phone number does not look right.";
  if (!address.address.trim()) issues.address = "Enter the delivery address.";
  if (!address.township.trim()) issues.township = "Enter the township.";
  if (!address.city.trim()) issues.city = "Choose the city or region.";
  if ((note ?? "").length > 500) issues.note = "Keep the note under 500 characters.";
  return issues;
}

export function validateCheckout(draft: CheckoutDraft): string[] {
  const issues: string[] = [];
  if (!draft.idempotencyKey.trim()) issues.push("The checkout is missing its request key — reload the page and try again.");
  if (!draft.items.length) issues.push("Your cart is empty.");
  for (const item of draft.items) {
    if (!Number.isFinite(item.quantity) || item.quantity < 1) issues.push(`${item.name}: the quantity must be at least 1.`);
    const price = item.unitPriceKs ?? item.priceMinKs;
    if (!Number.isFinite(price) || price <= 0) issues.push(`${item.name}: it has no price for this combination yet.`);
  }
  const fields = checkoutAddressIssues(draft.address, draft.note);
  for (const key of ["name", "phone", "address", "township", "city"] as const) {
    if (fields[key]) issues.push(fields[key]);
  }
  if (!CHECKOUT_PAYMENTS.some((method) => method.id === draft.payment)) issues.push("Choose how you want to pay.");
  if (fields.note) issues.push(fields.note);
  return issues;
}

export function nextOrderId(orders: readonly AdminOrder[]): string {
  const highest = orders.reduce((max, order) => {
    const match = /^#MH(\d+)$/.exec(order.id);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 1100);
  return `#MH${highest + 1}`;
}

export function findOrderByCheckoutKey(data: AdminDemoData, key: string): AdminOrder | undefined {
  if (!key) return undefined;
  return data.orders.find((order) => order.checkoutKey === key);
}

export function orderItemFromCart(item: CartItem): AdminOrderItem {
  const gsm = item.variant.gsm ? Number(item.variant.gsm) : null;
  return {
    productId: item.id,
    name: item.name,
    size: item.variant.size ?? "One size",
    color: item.variant.color ?? "As shown",
    quantity: Math.max(1, item.quantity),
    unitPriceKs: item.unitPriceKs ?? item.priceMinKs ?? 0,
    material: item.variant.material ?? undefined,
    gsm: Number.isFinite(gsm) ? gsm : null,
    fit: item.variant.fit ?? undefined,
    sleeve: item.variant.sleeve ?? undefined,
    design: null,
  };
}

/** Payment must complete before an order confirms, so a new order starts at Pending Payment. */
export function orderFromDraft(draft: CheckoutDraft, id: string): AdminOrder {
  return {
    id,
    checkoutKey: draft.idempotencyKey,
    customerName: draft.address.name.trim(),
    customerEmail: "",
    customerPhone: draft.address.phone.trim(),
    shipTo: {
      name: draft.address.name.trim(),
      phone: draft.address.phone.trim(),
      address: draft.address.address.trim(),
      township: draft.address.township.trim(),
      city: draft.address.city.trim(),
    },
    items: draft.items.map(orderItemFromCart),
    stage: "Pending Payment",
    payment: draft.payment,
    placedAt: draft.placedAt,
    note: (draft.note ?? "").trim(),
  };
}

export function placeOrder(
  data: AdminDemoData,
  draft: CheckoutDraft,
): { data: AdminDemoData; order: AdminOrder | null; created: boolean; issues: string[] } {
  const existing = findOrderByCheckoutKey(data, draft.idempotencyKey);
  if (existing) return { data, order: existing, created: false, issues: [] };
  const issues = validateCheckout(draft);
  if (issues.length) return { data, order: null, created: false, issues };
  const order = orderFromDraft(draft, nextOrderId(data.orders));
  return { data: { ...data, orders: [order, ...data.orders] }, order, created: true, issues: [] };
}

/** The provider id for a checkout payment method. */
export function providerIdFor(payment: string): PaymentProviderId {
  const key = payment.toLowerCase().replace(/[^a-z]/g, "");
  if (key === "kbzpay") return "kbzpay";
  if (key === "wavepay") return "wavepay";
  if (key === "ayapay") return "ayapay";
  return "visa";
}

/**
 * Applies a status the provider reported back (via its webhook) to the local order. The transition
 * itself lives in `applyPaymentEvent`, so the browser and the webhook cannot disagree.
 */
export function applyPaymentStatus(
  data: AdminDemoData,
  orderId: string,
  status: PaymentStatus,
  ref = "",
): { data: AdminDemoData; order: AdminOrder | null; issues: string[] } {
  const order = data.orders.find((entry) => entry.id === orderId);
  if (!order) return { data, order: null, issues: ["That order no longer exists."] };
  const event: PaymentEvent = {
    id: `local_${ref || orderId}_${status}`,
    ref,
    orderId,
    provider: "mock",
    status,
    amountKs: orderAmountKs(order),
    occurredAt: new Date().toISOString(),
  };
  const result = applyPaymentEvent(order, event);
  if (!result.changed) return { data, order: result.order, issues: result.issues };
  const orders = data.orders.map((entry) => (entry.id === orderId ? result.order : entry));
  // The points follow the money: a paid order earns its pieces, a refund takes them back.
  const ledger = result.order.stage === "Refunded"
    ? reversePurchase(data.loyaltyLedger ?? [], result.order.id).ledger
    : result.order.stage === "Pending Payment"
      ? data.loyaltyLedger ?? []
      : awardPurchase(data.loyaltyLedger ?? [], result.order, data.loyalty.rules, event.occurredAt).ledger;
  const next = syncStockWithStage({ ...data, orders, loyaltyLedger: ledger }, result.order.id, event.occurredAt);
  return {
    data: next,
    order: next.orders.find((entry) => entry.id === result.order.id) ?? result.order,
    issues: result.issues,
  };
}

export function checkoutSummary(draft: CheckoutDraft): { units: number; subtotalKs: number; lines: { name: string; detail: string; quantity: number; totalKs: number }[] } {
  return {
    units: checkoutUnits(draft.items),
    subtotalKs: checkoutSubtotalKs(draft.items),
    lines: draft.items.map((item) => ({
      name: item.name,
      detail: [item.variant.size, item.variant.color, item.variant.material, item.variant.gsm, item.variant.fit, item.variant.sleeve]
        .filter((part): part is string => Boolean(part))
        .join(" · "),
      quantity: Math.max(1, item.quantity),
      totalKs: lineTotalKs(item),
    })),
  };
}
