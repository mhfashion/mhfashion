import type { Metadata } from "next";
import AdminDesigns from "@/components/admin/AdminDesigns";

export const metadata: Metadata = {
  title: "Designs — MH Fashion Admin",
  robots: { index: false, follow: false },
};

export default function AdminDesignsPage() {
  return <AdminDesigns />;
}
