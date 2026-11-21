import type { Metadata } from "next";
import AdminPromotions from "@/components/admin/AdminPromotions";

export const metadata: Metadata = {
  title: "Promotions — MH Fashion Admin",
  robots: { index: false, follow: false },
};

export default function AdminPromotionsPage() {
  return <AdminPromotions />;
}
