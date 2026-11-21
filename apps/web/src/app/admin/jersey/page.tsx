import { redirect } from "next/navigation";

// Jersey mapping lives inside Posts (owner request 2026-11-21); the old bookmark still works.
export default function AdminJerseyPage() {
  redirect("/admin/posts?tab=jersey");
}
