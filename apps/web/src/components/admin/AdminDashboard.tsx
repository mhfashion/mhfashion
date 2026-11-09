"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight,
  BarChart3, Bell, Box, CalendarDays, ChevronDown, CircleHelp,
  ClipboardList, CreditCard, Globe2, House, Layers3, Menu,
  LogOut, MoreHorizontal, Package, Percent, Search, Settings, Shirt, ShoppingBag,
  Sparkles, Tag, Users, X,
  type LucideIcon,
} from "lucide-react";
import { getDemoAdminSession, signOutDemoAdmin, type AdminDemoSession } from "@/lib/admin-demo-auth";

type Metric = {
  label: string;
  value: string;
  change: string;
  icon: LucideIcon;
  tone: "lime" | "violet" | "blue" | "orange";
  direction?: "down";
};

const metrics: Metric[] = [
  { label: "Total Orders", value: "248", change: "+12.5%", icon: ShoppingBag, tone: "lime" },
  { label: "Total Revenue", value: "Ks 12,480,000", change: "+18.3%", icon: CreditCard, tone: "violet" },
  { label: "New Customers", value: "86", change: "+24.7%", icon: Users, tone: "blue" },
  { label: "Total Designs", value: "342", change: "+16.2%", icon: Layers3, tone: "orange" },
];

const navigation: { label: string; icon: LucideIcon; active?: boolean }[] = [
  { label: "Dashboard", icon: House, active: true },
  { label: "Orders", icon: ClipboardList },
  { label: "Products", icon: Package },
  { label: "Designs", icon: Layers3 },
  { label: "Customers", icon: Users },
  { label: "Inventory", icon: Box },
  { label: "Promotions", icon: Percent },
  { label: "Reports", icon: BarChart3 },
  { label: "Settings", icon: Settings },
];

const salesValues = [28, 55, 51, 74, 92, 86, 118];
const salesLabels = ["Nov 1", "Nov 2", "Nov 3", "Nov 4", "Nov 5", "Nov 6", "Nov 7"];

const orderStatuses = [
  { label: "Pending", count: 28, percent: "11.3%", color: "#f59e0b" },
  { label: "Processing", count: 64, percent: "25.8%", color: "#22a447" },
  { label: "Shipped", count: 112, percent: "45.2%", color: "#3978ef" },
  { label: "Delivered", count: 38, percent: "15.3%", color: "#9257ed" },
  { label: "Cancelled", count: 6, percent: "2.4%", color: "#ee5960" },
];

const products = [
  { name: "Classic T-shirt", details: "Combed Cotton · 180 GSM", sold: 742, revenue: "Ks 4,158,000", color: "#303943", icon: Shirt },
  { name: "Oversized T-shirt", details: "Cotton · 220 GSM", sold: 518, revenue: "Ks 3,249,000", color: "#dfe5ec", icon: Shirt },
  { name: "Hoodie", details: "Fleece · 320 GSM", sold: 361, revenue: "Ks 2,816,000", color: "#232a34", icon: Shirt },
  { name: "Cap", details: "Cotton Twill", sold: 289, revenue: "Ks 1,732,000", color: "#b6c1cc", icon: Tag },
  { name: "Polo Shirt", details: "Pique Cotton · 200 GSM", sold: 246, revenue: "Ks 1,489,000", color: "#e1e8ee", icon: Shirt },
];

const orders = [
  { id: "#MH1025", customer: "Thura Aung", initials: "TA", product: "T-shirt ×2", amount: "Ks 48,000", status: "Processing", tone: "yellow", time: "5m ago" },
  { id: "#MH1024", customer: "May Thu", initials: "MT", product: "Hoodie ×1", amount: "Ks 72,000", status: "Shipped", tone: "blue", time: "12m ago" },
  { id: "#MH1023", customer: "Kyaw Min", initials: "KM", product: "T-shirt ×3", amount: "Ks 96,000", status: "Delivered", tone: "green", time: "24m ago" },
  { id: "#MH1022", customer: "Su Hlaing", initials: "SH", product: "Cap ×1", amount: "Ks 28,000", status: "Processing", tone: "yellow", time: "36m ago" },
  { id: "#MH1021", customer: "Zin Min", initials: "ZM", product: "Polo ×2", amount: "Ks 68,000", status: "Cancelled", tone: "red", time: "1h ago" },
];

const activities: { title: string; detail: string; time: string; icon: LucideIcon; tone: string }[] = [
  { title: "New order received", detail: "#MH1025 by Thura Aung", time: "5m ago", icon: ShoppingBag, tone: "bg-[#e8f8ec] text-[#22a447]" },
  { title: "Design uploaded", detail: "“Street Vibes” by May Thu", time: "12m ago", icon: Layers3, tone: "bg-[#f0e9ff] text-[#9257ed]" },
  { title: "Order shipped", detail: "#MH1024 by Kyaw Min", time: "24m ago", icon: Package, tone: "bg-[#eaf1ff] text-[#3978ef]" },
  { title: "New customer registered", detail: "Zin Min", time: "36m ago", icon: Users, tone: "bg-[#edf0f4] text-[#667085]" },
  { title: "Low stock alert", detail: "Black T-shirt (Size L)", time: "1h ago", icon: AlertTriangle, tone: "bg-[#fff2df] text-[#ed8b22]" },
];

function MetricCard({ metric }: { metric: Metric }) {
  const Icon = metric.icon;
  const tone = {
    lime: "bg-[#e8f8d8] text-[#4cae22]",
    violet: "bg-[#f1e8ff] text-[#9650e8]",
    blue: "bg-[#e4efff] text-[#3978ef]",
    orange: "bg-[#fff0dc] text-[#ef8b24]",
  }[metric.tone];
  const stroke = {
    lime: "#75c944",
    violet: "#aa7beb",
    blue: "#5795f4",
    orange: "#f29d43",
  }[metric.tone];

  return (
    <article className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#e8ebef] bg-white p-4 shadow-[0_2px_10px_rgba(22,34,51,0.025)] sm:p-5">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tone}`}><Icon size={21} /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-medium text-[#7b8492]">{metric.label}</p>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <strong className="text-[18px] font-extrabold leading-6 tracking-tight text-[#151a22] sm:text-[20px]">{metric.value}</strong>
          <span className={`inline-flex items-center text-[10px] font-bold ${metric.direction === "down" ? "text-[#e85a61]" : "text-[#27a24d]"}`}>
            {metric.direction === "down" ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}{metric.change}
          </span>
        </div>
        <p className="mt-0.5 text-[9px] text-[#9aa2ae]">vs. last 7 days</p>
      </div>
      <svg aria-hidden="true" className="hidden h-9 w-[58px] shrink-0 sm:block" viewBox="0 0 58 36" fill="none">
        <path d="M2 31 C10 31 10 22 17 24 S25 28 31 18 S40 21 45 12 S52 14 56 4" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      </svg>
    </article>
  );
}

function SalesChart() {
  const points = salesValues.map((value, index) => {
    const x = 26 + (index * 560) / (salesValues.length - 1);
    const y = 174 - value * 1.15;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg role="img" aria-label="Preview sales trend rising from November 1 to November 7" viewBox="0 0 610 220" className="h-[205px] w-full overflow-visible">
      <defs>
        <linearGradient id="sales-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#64c447" stopOpacity=".22" /><stop offset="100%" stopColor="#64c447" stopOpacity="0" /></linearGradient>
      </defs>
      {[24, 68, 112, 156].map((y) => <line key={y} x1="26" y1={y} x2="590" y2={y} stroke="#edf0f3" strokeDasharray="3 5" />)}
      {["2M", "1.5M", "1M", "500K"].map((label, index) => <text key={label} x="0" y={28 + index * 44} fill="#9aa2ae" fontSize="9">{label}</text>)}
      <polygon points={`26,184 ${points} 586,184`} fill="url(#sales-fill)" />
      <polyline points={points} fill="none" stroke="#35a84e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {salesValues.map((value, index) => {
        const x = 26 + (index * 560) / (salesValues.length - 1);
        const y = 174 - value * 1.15;
        return <circle key={salesLabels[index]} cx={x} cy={y} r="4" fill="#fff" stroke="#35a84e" strokeWidth="2.5" />;
      })}
      {salesLabels.map((label, index) => <text key={label} x={26 + (index * 560) / 6} y="207" textAnchor="middle" fill="#8e97a4" fontSize="9">{label}</text>)}
    </svg>
  );
}

function StatusChart() {
  return (
    <div className="flex min-h-[228px] flex-col items-center justify-center gap-5 sm:flex-row sm:gap-7">
      <div
        role="img"
        aria-label="Order status preview: 28 pending, 64 processing, 112 shipped, 38 delivered, 6 cancelled"
        className="relative flex h-40 w-40 shrink-0 items-center justify-center rounded-full"
        style={{ background: "conic-gradient(#f59e0b 0 11.3%, #22a447 11.3% 37.1%, #3978ef 37.1% 82.3%, #9257ed 82.3% 97.6%, #ee5960 97.6% 100%)" }}
      >
        <div className="flex h-[104px] w-[104px] flex-col items-center justify-center rounded-full bg-white">
          <strong className="text-[25px] font-extrabold tracking-tight text-[#151a22]">248</strong>
          <span className="text-[10px] text-[#7b8492]">Total Orders</span>
        </div>
      </div>
      <div className="grid w-full grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-1">
        {orderStatuses.map((item) => <div key={item.label} className="flex items-center gap-2 text-[10px]">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="min-w-0 flex-1 truncate text-[#596271]">{item.label}</span>
          <span className="font-bold tabular-nums text-[#252c37]">{item.count}</span>
          <span className="w-10 text-right text-[#929ba7]">{item.percent}</span>
        </div>)}
      </div>
    </div>
  );
}

function Avatar({ initials, size = "normal" }: { initials: string; size?: "normal" | "small" }) {
  return <span className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#dff5cb] to-[#bfdbff] font-bold text-[#395068] ${size === "small" ? "h-7 w-7 text-[8px]" : "h-9 w-9 text-[10px]"}`}>{initials}</span>;
}

function StatusBadge({ status, tone }: { status: string; tone: string }) {
  const styles: Record<string, string> = {
    yellow: "bg-[#fff5d9] text-[#aa7600]",
    blue: "bg-[#e5efff] text-[#2d69d8]",
    green: "bg-[#e5f7e9] text-[#248b42]",
    red: "bg-[#ffeaeb] text-[#ce454d]",
  };
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-1 text-[9px] font-bold ${styles[tone] ?? styles.blue}`}>{status}</span>;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminDemoSession | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("Last 7 days");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const query = search.trim().toLowerCase();
  const visibleOrders = useMemo(() => orders.filter((order) => `${order.id} ${order.customer} ${order.product} ${order.status}`.toLowerCase().includes(query)), [query]);
  const visibleProducts = useMemo(() => products.filter((product) => `${product.name} ${product.details}`.toLowerCase().includes(query)), [query]);

  useEffect(() => {
    const session = getDemoAdminSession();
    if (!session) {
      router.replace("/admin/login");
      return;
    }
    setAdmin(session);
    setAuthReady(true);
  }, [router]);

  function handleSignOut() {
    signOutDemoAdmin();
    router.replace("/admin/login");
  }

  if (!authReady || !admin) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f4f6f9] text-[12px] font-medium text-[#66717e]">Checking local demo session…</div>;
  }

  const initials = admin.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "AD";

  return (
    <div data-admin-dashboard className="admin-dashboard -mb-16 min-h-screen bg-[#f4f6f9] text-[#171c25] md:mb-0">
      {sidebarOpen && <button type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-[69] bg-[#111820]/50 md:hidden" />}
      <div className="flex min-h-screen">
        <aside className={`fixed inset-y-0 left-0 z-[70] flex w-[224px] shrink-0 flex-col bg-[#11171b] text-white shadow-xl transition-transform duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0 md:shadow-none ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex h-[72px] items-center justify-between border-b border-white/[0.07] px-5">
            <a href="/admin" className="flex flex-col leading-none" aria-label="MH Fashion admin dashboard">
              <span className="text-[18px] font-black tracking-tight"><span className="text-[#8bd340]">MH</span> FASHION<span className="text-[#8bd340]">.</span></span>
              <span className="mt-1 text-[9px] font-medium tracking-[0.12em] text-[#8e979e]">ADMIN PANEL · PREVIEW</span>
            </a>
            <button type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="rounded-lg p-1.5 text-[#b8c0c6] hover:bg-white/10 md:hidden"><X size={18} /></button>
          </div>

          <nav aria-label="Admin navigation" className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
            {navigation.map(({ label, icon: Icon, active }) => active ? (
              <a key={label} href="/admin" aria-current="page" onClick={() => setSidebarOpen(false)} className="flex h-10 items-center gap-3 rounded-xl border-l-[3px] border-[#8bd340] bg-[#263a25] px-3 text-[12px] font-semibold text-[#a5ea62] shadow-[inset_0_0_0_1px_rgba(139,211,64,.1)]">
                <Icon size={17} />{label}
              </a>
            ) : (
              <button key={label} type="button" disabled title={`${label} admin module is not connected yet`} className="flex h-10 w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 text-left text-[12px] font-medium text-[#a6afb5]/75 opacity-70">
                <Icon size={17} />{label}<span className="ml-auto text-[8px] text-[#758079]">SOON</span>
              </button>
            ))}
            <div className="mx-2 my-5 border-t border-white/[0.08]" />
            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3.5">
              <div className="flex items-center gap-2 text-[#a9e269]"><Sparkles size={15} /><span className="text-[11px] font-bold">Create. Print. Wear.</span></div>
              <p className="mt-2 text-[10px] leading-4 text-[#a4adb3]">Make your own style and print it on premium apparel.</p>
              <a href="/create" className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-[#a9e269] hover:text-white">Open design editor <ArrowRight size={12} /></a>
            </div>
          </nav>

          <div className="border-t border-white/[0.08] p-3">
            <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
              <Avatar initials="AD" />
              <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-semibold text-white">{admin.name}</p><p className="truncate text-[9px] text-[#7f8b91]">{admin.email}</p></div>
              <button type="button" onClick={handleSignOut} aria-label="Sign out of demo account" title="Sign out" className="rounded-lg p-1.5 text-[#89939a] hover:bg-white/10 hover:text-white"><LogOut size={15} /></button>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-40 flex h-[64px] items-center gap-3 border-b border-[#e8ebef] bg-white/95 px-3 backdrop-blur sm:px-5 lg:px-7">
            <button type="button" aria-label="Open navigation" onClick={() => setSidebarOpen(true)} className="rounded-xl p-2 text-[#566070] hover:bg-[#f2f4f6] md:hidden"><Menu size={19} /></button>
            <label className="flex h-10 w-full max-w-[560px] items-center gap-2.5 rounded-full border border-[#e6e9ed] bg-[#f8f9fb] px-3.5 text-[#8c95a1] focus-within:border-[#a5d972] focus-within:bg-white">
              <Search size={16} className="shrink-0" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search orders and products" placeholder="Search orders, customers, products..." className="min-w-0 flex-1 bg-transparent text-[11px] text-[#252c37] outline-none placeholder:text-[#9da5af]" />
              <kbd className="hidden rounded-md border border-[#e4e7eb] bg-white px-1.5 py-0.5 text-[9px] text-[#8c95a1] sm:inline">Ctrl K</kbd>
            </label>
            <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2.5">
              <span className="hidden rounded-full bg-[#fff5dd] px-2.5 py-1.5 text-[9px] font-bold tracking-wide text-[#946b12] sm:inline">PREVIEW MODE</span>
              <button type="button" aria-label="Preview notifications" className="relative rounded-full p-2 text-[#505a68] hover:bg-[#f3f5f7]"><Bell size={18} /><span className="absolute right-1 top-1 h-2 w-2 rounded-full border-2 border-white bg-[#f04452]" /></button>
              <button type="button" aria-label="Help" className="hidden rounded-full p-2 text-[#505a68] hover:bg-[#f3f5f7] sm:block"><CircleHelp size={17} /></button>
              <button type="button" aria-label="Language settings" className="hidden rounded-full p-2 text-[#505a68] hover:bg-[#f3f5f7] md:block"><Globe2 size={17} /></button>
              <div className="hidden h-7 border-l border-[#e8ebef] sm:block" />
              <div className="flex items-center gap-2"><Avatar initials={initials} size="small" /><span className="hidden max-w-[110px] truncate text-[11px] font-bold text-[#27303b] sm:block">{admin.name}</span><button type="button" onClick={handleSignOut} aria-label="Sign out of demo account" className="rounded-lg p-1 text-[#87909c] hover:bg-[#f3f5f7]"><LogOut size={14} /></button></div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1700px] px-3 pb-8 pt-4 sm:px-5 sm:pt-6 lg:px-7">
            <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-[#f2dfab] bg-[#fff9e9] px-2.5 py-1 text-[9px] font-bold tracking-wide text-[#927018]"><Activity size={12} /> PREVIEW DASHBOARD · SAMPLE DATA</div>
                <h1 className="flex items-center gap-2 text-[23px] font-extrabold tracking-tight text-[#171c25] sm:text-[28px]">Good morning, {admin.name.split(/\s+/)[0]} <Sparkles size={17} className="text-[#70bd39]" aria-hidden="true" /></h1>
                <p className="mt-1 text-[11px] text-[#808a97] sm:text-[12px]">Here’s a preview of what’s happening with your MH Fashion store.</p>
              </div>
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <span className="inline-flex items-center gap-1.5 text-[10px] text-[#7e8794]"><CalendarDays size={14} /> Updated for preview</span>
                <label className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#e5e8ec] bg-white px-3 text-[10px] font-semibold text-[#505968] shadow-sm">
                  <CalendarDays size={14} className="text-[#788391]" />
                  <select aria-label="Select preview date range" value={period} onChange={(event) => setPeriod(event.target.value)} className="max-w-[105px] bg-transparent outline-none">
                    <option>Last 7 days</option><option>Last 30 days</option><option>Last 90 days</option>
                  </select>
                  <ChevronDown size={12} />
                </label>
              </div>
            </div>

            <section aria-label="Preview store metrics" className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}
            </section>

            <section aria-label="Preview analytics" className="mt-3 grid gap-3 xl:grid-cols-[1.15fr_.95fr_300px]">
              <article className="min-w-0 rounded-2xl border border-[#e8ebef] bg-white p-4 shadow-[0_2px_10px_rgba(22,34,51,0.025)] sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><h2 className="text-[14px] font-bold text-[#202733]">Sales Overview</h2><p className="mt-1 text-[10px] text-[#929ba7]">Revenue preview · {period.toLowerCase()}</p></div>
                  <div className="flex rounded-lg bg-[#f5f7f9] p-0.5 text-[9px] font-semibold text-[#7e8794]"><button className="rounded-md bg-white px-2 py-1 text-[#438f3b] shadow-sm" type="button">Revenue</button><button className="px-2 py-1" type="button">Orders</button></div>
                </div>
                <div className="mt-2"><SalesChart /></div>
                <div className="mt-1 flex items-center gap-4 border-t border-[#f0f2f4] pt-3 text-[9px] text-[#788391]"><span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#35a84e]" />Revenue</span><span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#b8c0ca]" />Orders</span><span className="ml-auto">Illustrative trend</span></div>
              </article>

              <article className="min-w-0 rounded-2xl border border-[#e8ebef] bg-white p-4 shadow-[0_2px_10px_rgba(22,34,51,0.025)] sm:p-5">
                <div className="flex items-start justify-between"><div><h2 className="text-[14px] font-bold text-[#202733]">Order Status</h2><p className="mt-1 text-[10px] text-[#929ba7]">Sample order breakdown</p></div><button type="button" aria-label="Order status options" className="rounded-lg p-1.5 text-[#8993a0] hover:bg-[#f4f6f8]"><MoreHorizontal size={17} /></button></div>
                <StatusChart />
              </article>

              <article className="min-w-0 rounded-2xl border border-[#e8ebef] bg-white p-4 shadow-[0_2px_10px_rgba(22,34,51,0.025)] sm:p-5">
                <div className="mb-3 flex items-center justify-between"><div><h2 className="text-[14px] font-bold text-[#202733]">Recent Activities</h2><p className="mt-1 text-[10px] text-[#929ba7]">Preview feed</p></div><button type="button" className="text-[9px] font-bold text-[#4c9d38]">View all <ArrowRight size={11} className="ml-0.5 inline" /></button></div>
                <div className="space-y-0.5">
                  {activities.map(({ title, detail, time, icon: Icon, tone }) => <div key={title} className="flex gap-2.5 border-b border-[#f0f2f4] py-3 last:border-0">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon size={15} /></span>
                    <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-1"><p className="text-[10px] font-bold leading-4 text-[#333c49]">{title}</p><span className="shrink-0 text-[8px] text-[#9aa2ae]">{time}</span></div><p className="mt-0.5 truncate text-[9px] text-[#87909b]">{detail}</p></div>
                  </div>)}
                </div>
              </article>
            </section>

            <section aria-label="Preview products and orders" className="mt-3 grid gap-3 xl:grid-cols-[.95fr_1.05fr]">
              <article className="min-w-0 overflow-hidden rounded-2xl border border-[#e8ebef] bg-white shadow-[0_2px_10px_rgba(22,34,51,0.025)]">
                <div className="flex items-center justify-between gap-3 border-b border-[#edf0f3] px-4 py-4 sm:px-5"><div><h2 className="text-[14px] font-bold text-[#202733]">Top Selling Products</h2><p className="mt-1 text-[10px] text-[#929ba7]">Sample ranking by units sold</p></div><button type="button" className="shrink-0 text-[9px] font-bold text-[#4c9d38]">View all <ArrowRight size={11} className="ml-0.5 inline" /></button></div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[460px] text-left text-[10px]"><thead className="bg-[#fafbfc] text-[9px] font-semibold text-[#828c99]"><tr><th className="px-4 py-2.5 font-semibold sm:px-5">Product</th><th className="px-3 py-2.5 font-semibold">Sold</th><th className="px-4 py-2.5 text-right font-semibold sm:px-5">Revenue</th></tr></thead>
                    <tbody className="divide-y divide-[#f0f2f4]">{visibleProducts.length ? visibleProducts.map((item, index) => { const Icon = item.icon; return <tr key={item.name} className="hover:bg-[#fafbfc]"><td className="px-4 py-2.5 sm:px-5"><div className="flex items-center gap-2.5"><span className="w-4 text-[9px] font-bold text-[#9ca5b0]">{index + 1}</span><span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: item.color }}><Icon size={19} className={item.color === "#303943" || item.color === "#232a34" ? "text-white" : "text-[#5e6b77]"} /></span><span className="min-w-0"><span className="block font-bold text-[#303844]">{item.name}</span><span className="mt-0.5 block text-[8px] text-[#919aa6]">{item.details}</span></span></div></td><td className="px-3 py-2.5 font-semibold tabular-nums text-[#505a68]">{item.sold}</td><td className="px-4 py-2.5 text-right font-semibold tabular-nums text-[#303844] sm:px-5">{item.revenue}</td></tr>; }) : <tr><td colSpan={3} className="px-5 py-8 text-center text-[#87909b]">No matching products</td></tr>}</tbody>
                  </table>
                </div>
              </article>

              <article className="min-w-0 overflow-hidden rounded-2xl border border-[#e8ebef] bg-white shadow-[0_2px_10px_rgba(22,34,51,0.025)]">
                <div className="flex items-center justify-between gap-3 border-b border-[#edf0f3] px-4 py-4 sm:px-5"><div><h2 className="text-[14px] font-bold text-[#202733]">Recent Orders</h2><p className="mt-1 text-[10px] text-[#929ba7]">Example order rows · not live</p></div><button type="button" className="shrink-0 text-[9px] font-bold text-[#4c9d38]">View all <ArrowRight size={11} className="ml-0.5 inline" /></button></div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[570px] text-left text-[10px]"><thead className="bg-[#fafbfc] text-[9px] font-semibold text-[#828c99]"><tr><th className="px-4 py-2.5 font-semibold sm:px-5">Order</th><th className="px-3 py-2.5 font-semibold">Customer</th><th className="px-3 py-2.5 font-semibold">Product</th><th className="px-3 py-2.5 font-semibold">Amount</th><th className="px-3 py-2.5 font-semibold">Status</th><th className="px-4 py-2.5 text-right font-semibold sm:px-5">Time</th></tr></thead>
                    <tbody className="divide-y divide-[#f0f2f4]">{visibleOrders.length ? visibleOrders.map((order) => <tr key={order.id} className="hover:bg-[#fafbfc]"><td className="whitespace-nowrap px-4 py-3 font-bold text-[#505a68] sm:px-5">{order.id}</td><td className="px-3 py-2.5"><div className="flex items-center gap-2"><Avatar initials={order.initials} size="small" /><span className="whitespace-nowrap font-medium text-[#394250]">{order.customer}</span></div></td><td className="whitespace-nowrap px-3 py-2.5 text-[#727d8a]">{order.product}</td><td className="whitespace-nowrap px-3 py-2.5 font-semibold text-[#394250]">{order.amount}</td><td className="px-3 py-2.5"><StatusBadge status={order.status} tone={order.tone} /></td><td className="whitespace-nowrap px-4 py-2.5 text-right text-[#919aa6] sm:px-5">{order.time}</td></tr>) : <tr><td colSpan={6} className="px-5 py-8 text-center text-[#87909b]">No matching orders</td></tr>}</tbody>
                  </table>
                </div>
              </article>
            </section>

            <footer className="mt-6 flex flex-col gap-2 border-t border-[#e5e9ee] pt-4 text-[9px] text-[#929ba7] sm:flex-row sm:items-center sm:justify-between">
              <p><strong className="text-[#4cae22]">MH FASHION.</strong> <span className="ml-1">Dashboard preview · Sample data only</span></p>
              <p className="flex items-center gap-3"><span>Demo session · local browser only</span><span>·</span><span>© MH Fashion</span></p>
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}
