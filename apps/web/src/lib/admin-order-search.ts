import type { AdminCustomer, AdminOrder } from "./admin-demo-data";

/**
 * Plan §17 S9: the admin lists search more than the name. An order is found by its number, the buyer, the
 * phone it was placed with, the delivery township and address, the payment reference, the courier's tracking
 * number, the print-desk note, and the items themselves. Everything goes through `matchesSearchQuery`, so the
 * same fold and the same word rules apply as on the storefront.
 */
export function orderSearchText(order: AdminOrder): string {
  const shipTo = order.shipTo;
  return [
    order.id,
    order.customerName,
    order.customerEmail,
    order.customerPhone,
    shipTo?.name,
    shipTo?.phone,
    shipTo?.address,
    shipTo?.township,
    shipTo?.city,
    order.stage,
    order.payment,
    order.paymentReference,
    order.trackingNumber,
    order.note,
    ...order.items.map((item) => `${item.name} ${item.size} ${item.color}`),
  ]
    .filter(Boolean)
    .join(" ");
}

/** A customer is found by name, email, phone or township — the phone is the usual handle in Myanmar. */
export function customerSearchText(customer: AdminCustomer): string {
  return [customer.name, customer.email, customer.phone].filter(Boolean).join(" ");
}

/** Plan §17 S9: the admin lists are paged 50 rows at a time, however the rows arrived. */
export const ADMIN_PAGE_SIZE = 50;

export function pageSlice<T>(items: T[], shown: number): T[] {
  return items.slice(0, Math.max(ADMIN_PAGE_SIZE, shown));
}

/** How many rows to show after one more press of "Show more". */
export function nextPageSize(shown: number, total: number): number {
  return Math.min(total, Math.max(ADMIN_PAGE_SIZE, shown) + ADMIN_PAGE_SIZE);
}
