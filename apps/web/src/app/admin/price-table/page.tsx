import { redirect } from "next/navigation";

// The spec-box sheet now lives inside Pricing, so the old route only forwards.
export default function AdminPriceTablePage() {
  redirect("/admin/pricing");
}
