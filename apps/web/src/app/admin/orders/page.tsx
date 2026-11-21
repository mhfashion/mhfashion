import type { Metadata } from "next";
import AdminOrders from "@/components/admin/AdminOrders";

export const metadata: Metadata = {
  title: "Orders — MH Fashion Admin",
  robots: { index: false, follow: false },
};

export default function AdminOrdersPage() {
  return <AdminOrders />;
}
