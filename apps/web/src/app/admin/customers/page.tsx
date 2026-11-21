import type { Metadata } from "next";
import AdminCustomers from "@/components/admin/AdminCustomers";

export const metadata: Metadata = {
  title: "Customers — MH Fashion Admin",
  robots: { index: false, follow: false },
};

export default function AdminCustomersPage() {
  return <AdminCustomers />;
}
