// Plan §12.2.6: a private file is returned only to the person it belongs to, or to an admin. The rule
// lives here as a pure function so the assets Worker and its tests agree, and so a new prefix has to be
// given an owner on purpose instead of falling through to "readable".
import { isSafeAssetKey } from "./asset-store";

export type AssetRole = "customer" | "admin";
export type AssetViewer = { id: string; role: AssetRole } | null;

/** What an admin may read: everything in the private bucket. */
export const ADMIN_PRIVATE_PREFIXES = ["catalog/", "users/", "tmp/", "orders/", "licences/"] as const;

/** The prefixes a customer owns by id: the working copy and everything a saved design keeps. */
const OWNER_PREFIXES = ["users/", "tmp/"] as const;

/** True when this viewer may read this private key. A public key is not answered from here at all. */
export function canReadPrivateAsset(viewer: AssetViewer, key: string): boolean {
  if (!viewer) return false;
  if (!isSafeAssetKey(key, "private")) return false;
  if (viewer.role === "admin") return ADMIN_PRIVATE_PREFIXES.some((prefix) => key.startsWith(prefix));
  if (!viewer.id) return false;
  return OWNER_PREFIXES.some((prefix) => key.startsWith(`${prefix}${viewer.id}/`));
}

/**
 * An admin reading a customer's own file is a support action, not routine work: the Worker writes one
 * audit line for it (who, which key, when) so the access is always visible (Plan §12.2.6).
 */
export function isAdminCustomerFileRead(viewer: AssetViewer, key: string): boolean {
  if (viewer?.role !== "admin") return false;
  return OWNER_PREFIXES.some((prefix) => key.startsWith(prefix));
}

/** Admin writes are the only writes: a customer uploads through `POST /api/uploads`, never here. */
export function canWriteAdmin(viewer: AssetViewer): boolean {
  return viewer?.role === "admin";
}

/** The owner id a private key names, so a route can check it belongs to the caller. */
export function ownerOfPrivateKey(key: string): string | null {
  const parts = key.split("/");
  if (parts[0] === "users" || parts[0] === "tmp") return parts[1] ?? null;
  return null;
}
