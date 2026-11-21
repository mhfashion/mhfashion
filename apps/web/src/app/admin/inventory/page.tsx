import type { Metadata } from "next";
import AdminInventory from "@/components/admin/AdminInventory";

export const metadata: Metadata = {
  title: "Inventory — MH Fashion Admin",
  robots: { index: false, follow: false },
};

export default function AdminInventoryPage() {
  return <AdminInventory />;
}
