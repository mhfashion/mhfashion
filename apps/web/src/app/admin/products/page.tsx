import type { Metadata } from "next";
import AdminProducts from "@/components/admin/AdminProducts";

export const metadata: Metadata = {
  title: "Products — MH Fashion Admin",
  robots: { index: false, follow: false },
};

export default function AdminProductsPage() {
  return <AdminProducts />;
}
