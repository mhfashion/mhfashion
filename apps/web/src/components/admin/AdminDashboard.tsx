"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, CalendarDays, ClipboardList, CreditCard, Layers3,
  Package, Search, ShoppingBag, Sparkles, Users,
} from "lucide-react";
import AdminSearchMisses from "@/components/admin/AdminSearchMisses";
import AdminShell, { AdminAvatar } from "@/components/admin/AdminShell";
import { AdminBadge, AdminCard, AdminCardHeader, AdminEmpty, AdminStat, type AdminTone } from "@/components/admin/AdminUi";
import { useAdminDemoData } from "@/lib/admin-demo-store";
import { matchesSearchQuery } from "@/lib/search-text";
import {
  formatAdminDateTime, formatKs, orderTotalKs, revenueByDay, summarizeOrders,
  topProducts, type AdminOrderStage,
} from "@/lib/admin-demo-data";

const STAGE_TONES: Record<string, AdminTone> = {
  "Pending Payment": "amber",
  Confirmed: "blue",
  Processing: "blue",
  Printing: "violet",
  "Ready to Ship": "green",
  "Handed to Delivery": "green",
  "Out for Delivery": "green",
  Delivered: "slate",
  Cancelled: "red",
  Refunded: "red",
};

const STATUS_BUCKETS: { label: string; stages: AdminOrderStage[]; color: string }[] = [
  { label: "Pending", stages: ["Pending Payment"], color: "#f59e0b" },
  { label: "Production", stages: ["Confirmed", "Processing", "Printing"], color: "#22a447" },
  { label: "Shipping", stages: ["Ready to Ship", "Handed to Delivery", "Out for Delivery"], color: "#3978ef" },
  { label: "Delivered", stages: ["Delivered"], color: "#9257ed" },
  { label: "Cancelled", stages: ["Cancelled", "Refunded"], color: "#ee5960" },
];

function SalesChart({ buckets }: { buckets: { label: string; revenueKs: number; orders: number }[] }) {
  const max = Math.max(...buckets.map((bucket) => bucket.revenueKs), 1);
  const step = 560 / Math.max(1, buckets.length - 1);
  const points = buckets.map((bucket, index) => `${26 + index * step},${174 - (bucket.revenueKs / max) * 140}`).join(" ");

  return (
    <svg role="img" aria-label={`Preview sales trend for the last ${buckets.length} days`} viewBox="0 0 610 220" className="h-[205px] w-full overflow-visible">
      <defs>
        <linearGradient id="sales-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#64c447" stopOpacity=".22" /><stop offset="100%" stopColor="#64c447" stopOpacity="0" /></linearGradient>
      </defs>
      {[24, 68, 112, 156].map((y) => <line key={y} x1="26" y1={y} x2="590" y2={y} stroke="#edf0f3" strokeDasharray="3 5" />)}
      {[1, 0.66, 0.33, 0].map((ratio, index) => (
        <text key={ratio} x="0" y={28 + index * 44} fill="#9aa2ae" fontSize="9">{Math.round(max * ratio).toLocaleString("en-US")}</text>
      ))}
      <polygon points={`26,184 ${points} 586,184`} fill="url(#sales-fill)" />
      <polyline points={points} fill="none" stroke="#35a84e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {buckets.map((bucket, index) => (
        <circle key={bucket.label} cx={26 + index * step} cy={174 - (bucket.revenueKs / max) * 140} r="4" fill="#fff" stroke="#35a84e" strokeWidth="2.5" />
      ))}
      {buckets.map((bucket, index) => (
        <text key={`label-${bucket.label}`} x={26 + index * step} y="207" textAnchor="middle" fill="#8e97a4" fontSize="9">{bucket.label}</text>
      ))}
    </svg>
  );
}

function StatusChart({ counts, total }: { counts: Record<string, number>; total: number }) {
  const counted = STATUS_BUCKETS.map((bucket) => ({
    ...bucket,
    count: bucket.stages.reduce((sum, stage) => sum + (counts[stage] ?? 0), 0),
  }));
  const segments = counted.map((bucket, index) => {
    const before = counted.slice(0, index).reduce((sum, item) => sum + item.count, 0);
    return {
      ...bucket,
      start: total ? (before / total) * 100 : 0,
      end: total ? ((before + bucket.count) / total) * 100 : 0,
    };
  });
  const gradient = segments
    .filter((segment) => segment.count > 0)
    .map((segment) => `${segment.color} ${segment.start.toFixed(2)}% ${segment.end.toFixed(2)}%`)
    .join(", ");

  return (
    <div className="flex min-h-[228px] flex-col items-center justify-center gap-5 sm:flex-row sm:gap-7">
      <div
        role="img"
        aria-label={`Order status preview across ${total} orders`}
        className="relative flex h-40 w-40 shrink-0 items-center justify-center rounded-full"
        style={{ background: gradient ? `conic-gradient(${gradient})` : "#e8ebef" }}
      >
        <div className="flex h-[104px] w-[104px] flex-col items-center justify-center rounded-full bg-white">
          <strong className="text-[25px] font-extrabold tracking-tight text-[#151a22]">{total}</strong>
          <span className="text-[10px] text-[#7b8492]">Total Orders</span>
        </div>
      </div>
      <div className="grid w-full grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-1">
        {segments.map((segment) => (
          <div key={segment.label} className="flex items-center gap-2 text-[10px]">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
            <span className="min-w-0 flex-1 truncate text-[#596271]">{segment.label}</span>
            <span className="font-bold tabular-nums text-[#252c37]">{segment.count}</span>
            <span className="w-10 text-right text-[#929ba7]">{total ? `${Math.round((segment.count / total) * 100)}%` : "0%"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const QUICK_LINKS = [
  { href: "/admin/orders", label: "Order queue", detail: "Advance stages and print hand-off", icon: ClipboardList },
  { href: "/admin/products", label: "Products", detail: "Create and edit the catalog", icon: Package },
  { href: "/admin/inventory", label: "Inventory", detail: "Stock per size and low-stock alerts", icon: Layers3 },
  { href: "/admin/promotions", label: "Promotions", detail: "Discount codes and usage limits", icon: CreditCard },
];

export default function AdminDashboard() {
  const data = useAdminDemoData();
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState(7);
  const query = search;

  const summary = useMemo(() => summarizeOrders(data.orders), [data.orders]);
  const buckets = useMemo(() => revenueByDay(data.orders, period), [data.orders, period]);
  const ranked = useMemo(() => topProducts(data.orders, 5), [data.orders]);
  const customerCount = useMemo(() => new Set(data.orders.map((order) => order.customerEmail)).size, [data.orders]);
  const publishedDesigns = useMemo(() => data.designs.filter((design) => design.status === "Published").length, [data.designs]);
  const recentOrders = useMemo(() => data.orders
    .filter((order) => matchesSearchQuery(`${order.id} ${order.customerName} ${order.items.map((item) => item.name).join(" ")} ${order.stage}`, query))
    .slice(0, 6), [data.orders, query]);
  const visibleProducts = useMemo(() => ranked.filter((product) => matchesSearchQuery(product.name.toLowerCase(), query)), [ranked, query]);
  const activity = useMemo(() => {
    const events = [
      ...data.orders.slice(0, 5).map((order) => ({
        id: `order-${order.id}`,
        title: `Order ${order.id}`,
        detail: `${order.customerName} · ${formatKs(orderTotalKs(order))}`,
        at: order.placedAt,
        href: "/admin/orders",
      })),
      ...data.designs.slice(0, 3).map((design) => ({
        id: `design-${design.id}`,
        title: design.name,
        detail: `${design.author} · ${design.status}`,
        at: design.createdAt,
        href: "/admin/designs",
      })),
    ];
    return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 4);
  }, [data.orders, data.designs]);

  return (
    <AdminShell
      active="dashboard"
      title={(admin) => `Good morning, ${admin.name.split(/\s+/)[0]}`}
      description="Here’s a preview of what’s happening with your MH Fashion store."
      badge="PREVIEW DASHBOARD · SAMPLE DATA"
      actions={(
        <label className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#e5e8ec] bg-white px-3 text-[10px] font-semibold text-[#505968] shadow-sm">
          <CalendarDays size={14} className="text-[#788391]" />
          <select aria-label="Select preview date range" value={period} onChange={(event) => setPeriod(Number(event.target.value))} className="max-w-[105px] bg-transparent outline-none">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </label>
      )}
      search={(
        <label className="flex h-10 w-full max-w-[560px] items-center gap-2.5 rounded-full border border-[#e6e9ed] bg-[#f8f9fb] px-3.5 text-[#8c95a1] focus-within:border-[#a5d972] focus-within:bg-white">
          <Search size={16} className="shrink-0" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search orders and products" placeholder="Search orders, customers, products..." className="min-w-0 flex-1 bg-transparent text-[11px] text-[#252c37] outline-none placeholder:text-[#9da5af]" />
        </label>
      )}
    >
      <section aria-label="Preview store metrics" className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Total Orders" value={String(summary.count)} hint={`${summary.units} units in the queue`} icon={<ShoppingBag size={21} />} />
        <AdminStat label="Total Revenue" value={formatKs(summary.revenueKs)} hint={`Avg ${formatKs(summary.averageOrderKs)} per order`} icon={<CreditCard size={21} />} />
        <AdminStat label="Customers" value={String(customerCount)} hint="Unique buyers in this preview set" icon={<Users size={21} />} />
        <AdminStat label="Published Designs" value={String(publishedDesigns)} hint={`${data.designs.length} designs in total`} icon={<Layers3 size={21} />} />
      </section>

      <section aria-label="Preview analytics" className="mt-3 grid gap-3 xl:grid-cols-[1.15fr_.95fr_300px]">
        <AdminCard className="flex flex-col p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="text-[14px] font-bold text-[#202733]">Sales Overview</h2><p className="mt-1 text-[10px] text-[#929ba7]">Revenue preview · last {period} days</p></div>
            <Link href="/admin/reports" className="text-[9px] font-bold text-[#4c9d38]">Open reports <ArrowRight size={11} className="ml-0.5 inline" /></Link>
          </div>
          <div className="mt-2 flex flex-1 items-center"><SalesChart buckets={buckets} /></div>
          <div className="mt-1 flex items-center gap-4 border-t border-[#f0f2f4] pt-3 text-[9px] text-[#788391]"><span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#35a84e]" />Revenue</span><span className="ml-auto">Sample data from this browser</span></div>
        </AdminCard>

        <AdminCard className="p-4 sm:p-5">
          <div className="flex items-start justify-between"><div><h2 className="text-[14px] font-bold text-[#202733]">Order Status</h2><p className="mt-1 text-[10px] text-[#929ba7]">Live from the demo order queue</p></div></div>
          <StatusChart counts={summary.byStage} total={summary.count} />
        </AdminCard>

        <AdminCard className="overflow-hidden">
          <AdminCardHeader title="Recent Activity" description="Orders and designs" actions={<Link href="/admin/orders" className="text-[9px] font-bold text-[#4c9d38]">View all <ArrowRight size={11} className="ml-0.5 inline" /></Link>} />
          <div className="space-y-0.5">
            {activity.map((event) => (
              <Link key={event.id} href={event.href} className="flex gap-2.5 border-b border-[#f0f2f4] px-4 py-3 last:border-0 hover:bg-[#fafbfc] sm:px-5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#eef4e6] text-[#4cae22]"><Sparkles size={14} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-1"><p className="text-[10px] font-bold leading-4 text-[#333c49]">{event.title}</p><span className="shrink-0 text-[8px] text-[#9aa2ae]">{formatAdminDateTime(event.at)}</span></div>
                  <p className="mt-0.5 truncate text-[9px] text-[#87909b]">{event.detail}</p>
                </div>
              </Link>
            ))}
          </div>
        </AdminCard>
      </section>

      <section aria-label="Preview products and orders" className="mt-3 grid gap-3 xl:grid-cols-[.95fr_1.05fr]">
        <AdminCard className="overflow-hidden">
          <AdminCardHeader title="Top Selling Products" description="Ranked by units sold" actions={<Link href="/admin/products" className="text-[9px] font-bold text-[#4c9d38]">Manage <ArrowRight size={11} className="ml-0.5 inline" /></Link>} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[460px] text-left text-[10px]">
              <thead className="bg-[#fafbfc] text-[9px] font-semibold text-[#828c99]"><tr><th className="px-4 py-2.5 font-semibold sm:px-5">Product</th><th className="px-3 py-2.5 font-semibold">Sold</th><th className="px-4 py-2.5 text-right font-semibold sm:px-5">Revenue</th></tr></thead>
              <tbody className="divide-y divide-[#f0f2f4]">
                {visibleProducts.length ? visibleProducts.map((product, index) => (
                  <tr key={product.name} className="hover:bg-[#fafbfc]">
                    <td className="px-4 py-2.5 sm:px-5">
                      <div className="flex items-center gap-2.5">
                        <span className="w-4 text-[9px] font-bold text-[#9ca5b0]">{index + 1}</span>
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#eef1f5]"><Package size={17} className="text-[#5e6b77]" /></span>
                        <span className="min-w-0 font-bold text-[#303844]">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-semibold tabular-nums text-[#505a68]">{product.units}</td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-[#303844] sm:px-5">{formatKs(product.revenueKs)}</td>
                  </tr>
                )) : <tr><td colSpan={3}><AdminEmpty title="No matching products" /></td></tr>}
              </tbody>
            </table>
          </div>
        </AdminCard>

        <AdminCard className="overflow-hidden">
          <AdminCardHeader title="Recent Orders" description="Newest first · updates live" actions={<Link href="/admin/orders" className="text-[9px] font-bold text-[#4c9d38]">Open queue <ArrowRight size={11} className="ml-0.5 inline" /></Link>} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[570px] text-left text-[10px]">
              <thead className="bg-[#fafbfc] text-[9px] font-semibold text-[#828c99]"><tr><th className="px-4 py-2.5 font-semibold sm:px-5">Order</th><th className="px-3 py-2.5 font-semibold">Customer</th><th className="px-3 py-2.5 font-semibold">Amount</th><th className="px-3 py-2.5 font-semibold">Stage</th><th className="px-4 py-2.5 text-right font-semibold sm:px-5">Placed</th></tr></thead>
              <tbody className="divide-y divide-[#f0f2f4]">
                {recentOrders.length ? recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-[#fafbfc]">
                    <td className="whitespace-nowrap px-4 py-3 font-bold text-[#505a68] sm:px-5">{order.id}</td>
                    <td className="px-3 py-2.5"><div className="flex items-center gap-2"><AdminAvatar initials={order.customerName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()} small /><span className="whitespace-nowrap font-medium text-[#394250]">{order.customerName}</span></div></td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-[#394250]">{formatKs(orderTotalKs(order))}</td>
                    <td className="px-3 py-2.5"><AdminBadge tone={STAGE_TONES[order.stage] ?? "slate"}>{order.stage}</AdminBadge></td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right text-[#919aa6] sm:px-5">{formatAdminDateTime(order.placedAt)}</td>
                  </tr>
                )) : <tr><td colSpan={5}><AdminEmpty title="No matching orders" /></td></tr>}
              </tbody>
            </table>
          </div>
        </AdminCard>
      </section>

      <section aria-label="Search misses" className="mt-3 grid gap-3">
        <AdminSearchMisses days={period} />
      </section>

      <section aria-label="Admin shortcuts" className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {QUICK_LINKS.map(({ href, label, detail, icon: Icon }) => (
          <Link key={href} href={href} className="group flex items-center gap-3 rounded-2xl border border-[#e8ebef] bg-white p-4 shadow-[0_2px_10px_rgba(22,34,51,0.025)] transition-colors hover:border-[#cfe6bb]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef4e6] text-[#4cae22]"><Icon size={18} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-bold text-[#27303b]">{label}</span>
              <span className="mt-0.5 block truncate text-[9px] text-[#87909b]">{detail}</span>
            </span>
            <ArrowUpRight size={15} className="shrink-0 text-[#a7b1bb] group-hover:text-[#4cae22]" />
          </Link>
        ))}
      </section>
    </AdminShell>
  );
}
