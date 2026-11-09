import type { Metadata } from "next";
import AdminAuthPanel from "@/components/admin/AdminAuthPanel";

export const metadata: Metadata = {
  title: "Admin Sign In — MH Fashion",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return <AdminAuthPanel mode="login" />;
}
