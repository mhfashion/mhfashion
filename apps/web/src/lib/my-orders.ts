import type { AdminOrder, AdminOrderItem } from "@/lib/admin-demo-data";
import { orderAmountKs } from "@/lib/payments";

/**
 * Orders placed on this device. There are no accounts yet, so the only order that belongs to the
 * person looking at the page is the one this browser created: checkout stamps `checkoutKey`, and the
 * seeded demo orders (which exist for the admin preview) do not have one.
 */
export function isCheckoutOrder(order: AdminOrder): boolean {
  return Boolean(order.checkoutKey);
}

/** Newest first, without touching the admin's own ordering. */
export function myOrders(orders: readonly AdminOrder[]): AdminOrder[] {
  return orders
    .filter(isCheckoutOrder)
    .slice()
    .sort((left, right) => Date.parse(right.placedAt) - Date.parse(left.placedAt));
}

export function orderUnits(order: AdminOrder): number {
  return order.items.reduce((total, item) => total + Math.max(1, item.quantity), 0);
}

export function orderTotalKs(order: AdminOrder): number {
  return orderAmountKs(order);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * "1 Sep 2026" in Yangon time. The month name is spelled out here because en-GB renders September as
 * "Sept" in some ICU builds, and the server and the browser must not print different text.
 */
export function formatOrderDate(placedAt: string): string {
  const date = new Date(placedAt);
  if (Number.isNaN(date.getTime())) return "—";
  const parts = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "numeric", year: "numeric", timeZone: "Asia/Yangon" }).formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return `${value("day")} ${MONTHS[value("month") - 1]} ${value("year")}`;
}

export function orderItemDetail(item: AdminOrderItem): string {
  return [item.size, item.color, item.material, item.gsm ? `${item.gsm} GSM` : "", item.fit, item.sleeve]
    .filter((part): part is string => Boolean(part && part !== "-"))
    .join(" · ");
}

export type StageTone = "green" | "yellow" | "blue" | "red" | "slate";

/** The colour the badge uses; paid-and-moving stages read green, a stopped order reads red. */
export function orderStageTone(stage: string): StageTone {
  switch (stage) {
    case "Delivered":
      return "green";
    case "Pending Payment":
      return "yellow";
    case "Confirmed":
    case "Processing":
    case "Printing":
    case "Ready to Ship":
      return "blue";
    case "Handed to Delivery":
    case "Out for Delivery":
      return "slate";
    case "Cancelled":
    case "Refunded":
      return "red";
    default:
      return "slate";
  }
}

export const STAGE_TONE_CLASS: Record<StageTone, string> = {
  green: "bg-[#eaf8d7] text-[#4f9d16]",
  yellow: "bg-[#fff5d9] text-[#b07d00]",
  blue: "bg-[#e6f1ff] text-[#3e81c9]",
  red: "bg-[#ffe9e5] text-[#c0392b]",
  slate: "bg-bg-surface text-text-muted border border-border",
};
