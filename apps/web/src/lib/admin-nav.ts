import type { AdminModuleId } from "./admin-demo-data";

/**
 * The admin sections in the order the dashboard lists them. The shell's sidebar and the storefront menu
 * both read this list, so a new module cannot appear in one and be missing from the other.
 */
export const ADMIN_NAV: { id: AdminModuleId; label: string; href: string }[] = [
  { id: "dashboard", label: "Dashboard", href: "/admin" },
  { id: "orders", label: "Orders", href: "/admin/orders" },
  { id: "products", label: "Products", href: "/admin/products" },
  { id: "posts", label: "Posts", href: "/admin/posts" },
  { id: "ads", label: "Ads", href: "/admin/ads" },
  { id: "pricing", label: "Price Table", href: "/admin/pricing" },
  { id: "attributes", label: "Attributes", href: "/admin/attributes" },
  { id: "settlements", label: "Settlements", href: "/admin/settlements" },
  { id: "loyalty", label: "Loyalty", href: "/admin/loyalty" },
  { id: "customers", label: "Customers", href: "/admin/customers" },
  { id: "inventory", label: "Inventory", href: "/admin/inventory" },
  { id: "promotions", label: "Promotions", href: "/admin/promotions" },
  { id: "reports", label: "Reports", href: "/admin/reports" },
  { id: "messages", label: "Messages", href: "/admin/messages" },
  { id: "settings", label: "Settings", href: "/admin/settings" },
];
