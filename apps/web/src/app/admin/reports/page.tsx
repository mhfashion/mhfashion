import type { Metadata } from "next";
import AdminReports from "@/components/admin/AdminReports";

export const metadata: Metadata = {
  title: "Reports — MH Fashion Admin",
  robots: { index: false, follow: false },
};

export default function AdminReportsPage() {
  return <AdminReports />;
}
