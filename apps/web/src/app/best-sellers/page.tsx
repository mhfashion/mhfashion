import { redirect } from "next/navigation";

// One ranked list lives at /popular; the footer link keeps working without a second copy of it.
export default function BestSellersPage() {
  redirect("/popular");
}
