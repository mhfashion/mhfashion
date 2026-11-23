import type { Metadata } from "next";
import AdminMessages from "@/components/admin/AdminMessages";

export const metadata: Metadata = {
  title: "Messages — MH Fashion Admin",
  robots: { index: false, follow: false },
};

export default function AdminMessagesPage() {
  return <AdminMessages />;
}
