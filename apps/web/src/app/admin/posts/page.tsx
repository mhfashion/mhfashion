import type { Metadata } from "next";
import { Suspense } from "react";
import AdminPosts from "@/components/admin/AdminPosts";

export const metadata: Metadata = {
  title: "Posts — MH Fashion Admin",
  robots: { index: false, follow: false },
};

export default function AdminPostsPage() {
  // AdminPosts reads ?tab= to open the Jersey mapping straight from /admin/jersey.
  return (
    <Suspense fallback={null}>
      <AdminPosts />
    </Suspense>
  );
}
