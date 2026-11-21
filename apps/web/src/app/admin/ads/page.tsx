import type { Metadata } from "next";
import AdminAds from "@/components/admin/AdminAds";

export const metadata: Metadata = {
  title: "Ads — MH Fashion Admin",
  robots: { index: false, follow: false },
};

export default function AdminAdsPage() {
  return <AdminAds />;
}
