// Stock follows the order (Plan §16 Inventory). Until now `/admin/inventory` was a number the shop
// typed by hand: a paid order never moved it, so "Stock to watch" kept reporting the seed figures while
// garments were sold. This module is the one place a sale touches stock.
//
// Stock is blank-garment stock, so a sale consumes it and a refund or a cancellation puts it back. It is
// never allowed to go negative: a sale the blanks cannot cover still completes (the customer already paid)
// and the shortage is recorded on the order for the print desk to restock, instead of being hidden by a
// silent clamp.

import type { AdminDemoData, AdminOrder } from "@/lib/admin-demo-data";
import { adjustStock } from "@/lib/admin-demo-data";
import { applyVariantStockForOrder } from "@/lib/pricing-variants";

export type StockLine = { productId: string; size: string; quantity: number };
export type StockShortfall = { productId: string; size: string; wanted: number; available: number };

/** One line per product and size, because an order can hold the same size twice. */
export function stockLinesFor(order: AdminOrder): StockLine[] {
  const lines = new Map<string, StockLine>();
  for (const item of order.items) {
    const size = item.size || "-";
    const key = `${item.productId}|${size}`;
    const quantity = Math.max(1, item.quantity);
    const existing = lines.get(key);
    if (existing) existing.quantity += quantity;
    else lines.set(key, { productId: item.productId, size, quantity });
  }
  return [...lines.values()];
}

function available(data: AdminDemoData, productId: string, size: string): number {
  return data.stock[productId]?.[size] ?? 0;
}

export type StockMovementResult = {
  data: AdminDemoData;
  moved: StockLine[];
  shortfalls: StockShortfall[];
  issues: string[];
};

/**
 * Deducts the order's pieces once and records exactly what it took. The stamp lives on the order, so a
 * replayed payment or a second provider callback cannot take the stock twice.
 */
export function consumeStock(data: AdminDemoData, orderId: string, at: string): StockMovementResult {
  const order = data.orders.find((entry) => entry.id === orderId);
  if (!order) return { data, moved: [], shortfalls: [], issues: ["That order no longer exists."] };
  if (order.stockConsumedAt) return { data, moved: [], shortfalls: [], issues: [] };

  const moved: StockLine[] = [];
  const shortfalls: StockShortfall[] = [];
  let next = data;
  for (const line of stockLinesFor(order)) {
    const have = available(next, line.productId, line.size);
    if (have < line.quantity) shortfalls.push({ productId: line.productId, size: line.size, wanted: line.quantity, available: have });
    const taken = Math.min(have, line.quantity);
    if (taken > 0) {
      next = adjustStock(next, line.productId, line.size, -taken);
      moved.push({ ...line, quantity: taken });
    }
  }
  const orders = next.orders.map((entry) => (entry.id === orderId
    ? { ...entry, stockConsumedAt: at, stockRestoredAt: undefined, stockTaken: moved, stockShortfall: shortfalls }
    : entry));
  return { data: { ...next, orders }, moved, shortfalls, issues: [] };
}

/**
 * A refund or a cancellation gives back exactly what the sale took, once, and clears the stamp so a
 * re-payment takes them again.
 */
export function restoreStock(data: AdminDemoData, orderId: string, at: string): StockMovementResult {
  const order = data.orders.find((entry) => entry.id === orderId);
  if (!order) return { data, moved: [], shortfalls: [], issues: ["That order no longer exists."] };
  if (!order.stockConsumedAt || order.stockRestoredAt) return { data, moved: [], shortfalls: [], issues: [] };

  const taken = order.stockTaken ?? stockLinesFor(order);
  let next = data;
  for (const line of taken) {
    if (line.quantity > 0) next = adjustStock(next, line.productId, line.size, line.quantity);
  }
  const orders = next.orders.map((entry) => (entry.id === orderId
    ? { ...entry, stockConsumedAt: undefined, stockRestoredAt: at, stockTaken: undefined, stockShortfall: undefined }
    : entry));
  return { data: { ...next, orders }, moved: taken, shortfalls: [], issues: [] };
}

/**
 * Keeps stock in step with whatever stage the order ended up in, whichever path moved it — the provider
 * callback, an admin stage change or an approved refund. One call site per path, one rule.
 */
export function syncStockWithStage(data: AdminDemoData, orderId: string, at = new Date().toISOString()): AdminDemoData {
  const order = data.orders.find((entry) => entry.id === orderId);
  if (!order) return data;
  // The Price Table's variant stock always follows a sale; it is the figure the shop shows.
  const withVariantStock = order.stage === "Cancelled" || order.stage === "Refunded"
    ? applyVariantStockForOrder(data, orderId, "restore").data
    : order.stage === "Pending Payment"
      ? data
      : applyVariantStockForOrder(data, orderId, "take").data;

  // Owner decision 2026-11-21: Inventory is blank-garment stock and does not cap sales, so a sale leaves
  // it alone unless the shop switches `deductStockOnSale` on.
  if (!data.settings.deductStockOnSale) return withVariantStock;
  if (order.stage === "Cancelled" || order.stage === "Refunded") return restoreStock(withVariantStock, orderId, at).data;
  if (order.stage === "Pending Payment") return withVariantStock;
  return consumeStock(withVariantStock, orderId, at).data;
}

/** What the order holds now: nothing before payment, taken once paid, put back once refunded. */
export function stockStatus(order: AdminOrder): "none" | "taken" | "restored" {
  if (order.stockConsumedAt) return "taken";
  return order.stockRestoredAt ? "restored" : "none";
}
