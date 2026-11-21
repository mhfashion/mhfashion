"use client";

import { useSyncExternalStore } from "react";
import {
  readAdminDemoData,
  subscribeAdminDemoData,
  updateAdminDemoData,
  type AdminDemoData,
} from "@/lib/admin-demo-data";

export function useAdminDemoData(): AdminDemoData {
  return useSyncExternalStore(subscribeAdminDemoData, readAdminDemoData, readAdminDemoData);
}

export function updateAdminData(update: (current: AdminDemoData) => AdminDemoData) {
  updateAdminDemoData(update);
}

export * from "@/lib/admin-demo-data";
