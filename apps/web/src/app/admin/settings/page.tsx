import type { Metadata } from "next";
import AdminSettings from "@/components/admin/AdminSettings";

export const metadata: Metadata = {
  title: "Settings — MH Fashion Admin",
  robots: { index: false, follow: false },
};

export default function AdminSettingsPage() {
  return <AdminSettings />;
}
