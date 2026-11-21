// The delivery address a customer already gave us. There is no customer account on the server yet,
// so the address lives on the device: it is written after an order and reused by the next checkout,
// and an existing order is used as the fallback so nobody has to type it twice.
import type { AdminOrder } from "@/lib/admin-demo-data";
import { myOrders } from "@/lib/my-orders";
import type { CheckoutAddress } from "@/lib/checkout";

const STORAGE_KEY = "mh-fashion-delivery-address-v1";

export function isCompleteAddress(address: Partial<CheckoutAddress> | null | undefined): address is CheckoutAddress {
  if (!address) return false;
  return [address.name, address.phone, address.address, address.township, address.city]
    .every((part) => typeof part === "string" && part.trim().length > 0);
}

export function readSavedAddress(): CheckoutAddress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<CheckoutAddress>;
    return isCompleteAddress(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveDeliveryAddress(address: CheckoutAddress) {
  if (typeof window === "undefined" || !isCompleteAddress(address)) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(address));
  } catch {
    // A full or blocked storage must not stop the order.
  }
}

/** The newest order this browser placed, when the device has no saved address yet. */
export function lastOrderAddress(orders: readonly AdminOrder[]): CheckoutAddress | null {
  for (const order of myOrders(orders)) {
    if (isCompleteAddress(order.shipTo)) return order.shipTo;
  }
  return null;
}

export function addressSummary(address: CheckoutAddress): string {
  return [address.address, address.township, address.city].map((part) => part.trim()).filter(Boolean).join(", ");
}
