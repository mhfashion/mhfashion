// A customer's own record: the email the account was opened with and the delivery address saved with
// it. There is no customer table on the server yet, so the record lives on the device. Checkout reads
// it first, so a returning customer is never asked to type an address they already gave us.
import { isCompleteAddress } from "@/lib/delivery-address";
import { EMPTY_ADDRESS, type CheckoutAddress } from "@/lib/checkout";

const STORAGE_KEY = "mh-fashion-account-profile-v1";

export type AccountProfile = {
  email: string;
  delivery: CheckoutAddress;
};

export const EMPTY_ACCOUNT_PROFILE: AccountProfile = { email: "", delivery: EMPTY_ADDRESS };

function storage(): Storage | null {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") return null;
  return window.localStorage;
}

/** The saved profile, or null when the customer has not saved one on this device. */
export function readAccountProfile(): AccountProfile | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<AccountProfile>;
    if (!value || typeof value !== "object" || typeof value.email !== "string") return null;
    return { email: value.email, delivery: normalizeDelivery(value.delivery) };
  } catch {
    return null;
  }
}

function normalizeDelivery(raw: unknown): CheckoutAddress {
  const value = (raw && typeof raw === "object" ? raw : {}) as Partial<CheckoutAddress>;
  return {
    name: typeof value.name === "string" ? value.name : "",
    phone: typeof value.phone === "string" ? value.phone : "",
    address: typeof value.address === "string" ? value.address : "",
    township: typeof value.township === "string" ? value.township : "",
    city: typeof value.city === "string" ? value.city : "",
  };
}

export function saveAccountProfile(profile: AccountProfile) {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify({ email: profile.email.trim(), delivery: normalizeDelivery(profile.delivery) }));
  } catch {
    // A full or blocked storage must not stop the customer from using the site.
  }
}

/**
 * The address checkout fills in: only a complete one is worth prefilling, because a half-saved
 * address would leave the form looking filled while the order cannot be placed.
 */
export function accountDeliveryAddress(): CheckoutAddress | null {
  const profile = readAccountProfile();
  return profile && isCompleteAddress(profile.delivery) ? profile.delivery : null;
}

/**
 * Keeps the account's address in step with the one actually used on an order. Only an existing
 * profile is updated — a guest who never opened an account is not given one behind their back.
 */
export function saveAccountDelivery(address: CheckoutAddress) {
  const profile = readAccountProfile();
  if (!profile || !isCompleteAddress(address)) return;
  saveAccountProfile({ ...profile, delivery: address });
}
