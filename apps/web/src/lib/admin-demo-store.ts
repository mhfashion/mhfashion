"use client";

import { useSyncExternalStore } from "react";
import {
  createAdminDemoData,
  readAdminDemoData,
  subscribeAdminDemoData,
  updateAdminDemoData,
  type AdminDemoData,
} from "@/lib/admin-demo-data";

let seedSnapshot: AdminDemoData | null = null;

/**
 * The snapshot used for the server render and for hydration. It must be the seeded demo data, not
 * this browser's saved orders, or the first client render disagrees with the HTML the server sent:
 * React then throws the whole tree away and re-renders it, which among other things appends a second
 * copy of the JSON-LD scripts in the root layout.
 */
function readSeedSnapshot(): AdminDemoData {
  if (!seedSnapshot) seedSnapshot = createAdminDemoData();
  return seedSnapshot;
}

export function useAdminDemoData(): AdminDemoData {
  return useSyncExternalStore(subscribeAdminDemoData, readAdminDemoData, readSeedSnapshot);
}

export function updateAdminData(update: (current: AdminDemoData) => AdminDemoData) {
  updateAdminDemoData(update);
}

export * from "@/lib/admin-demo-data";
