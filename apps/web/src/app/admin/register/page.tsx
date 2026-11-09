import type { Metadata } from "next";
import AdminAuthPanel from "@/components/admin/AdminAuthPanel";

export const metadata: Metadata = {
  title: "Create Admin Demo Account — MH Fashion",
  robots: { index: false, follow: false },
};

export default function AdminRegisterPage() {
  return <AdminAuthPanel mode="register" />;
}
