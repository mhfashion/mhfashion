"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BarChart3, Bell, Box, Brush, CircleHelp, ClipboardList, Globe2, House, Inbox, Layers3, LogOut, Megaphone, Menu, Newspaper, Package, Percent, Crown, HandCoins, Settings, SlidersHorizontal, Sparkles, Tags, type LucideIcon, Users, X } from "lucide-react";
import { getDemoAdminSession, signOutDemoAdmin, type AdminDemoSession } from "@/lib/admin-demo-auth";
import type { AdminModuleId } from "@/lib/admin-demo-data";

const NAV: { id: AdminModuleId; label: string; href: string; icon: LucideIcon }[] = [
  { id: "dashboard", label: "Dashboard", href: "/admin", icon: House },
  { id: "orders", label: "Orders", href: "/admin/orders", icon: ClipboardList },
  { id: "products", label: "Products", href: "/admin/products", icon: Package },
  { id: "designs", label: "Designs", href: "/admin/designs", icon: Layers3 },
  { id: "posts", label: "Posts", href: "/admin/posts", icon: Newspaper },
  { id: "ads", label: "Ads", href: "/admin/ads", icon: Megaphone },
  { id: "pricing", label: "Pricing", href: "/admin/pricing", icon: Tags },
  { id: "attributes", label: "Attributes", href: "/admin/attributes", icon: SlidersHorizontal },
  { id: "brushes", label: "Brushes", href: "/admin/brushes", icon: Brush },
  { id: "settlements", label: "Settlements", href: "/admin/settlements", icon: HandCoins },
  { id: "loyalty", label: "Loyalty", href: "/admin/loyalty", icon: Crown },
  { id: "customers", label: "Customers", href: "/admin/customers", icon: Users },
  { id: "inventory", label: "Inventory", href: "/admin/inventory", icon: Box },
  { id: "promotions", label: "Promotions", href: "/admin/promotions", icon: Percent },
  { id: "reports", label: "Reports", href: "/admin/reports", icon: BarChart3 },
  { id: "messages", label: "Messages", href: "/admin/messages", icon: Inbox },
  { id: "settings", label: "Settings", href: "/admin/settings", icon: Settings },
];

export function AdminAvatar({ initials, small = false }: { initials: string; small?: boolean }) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#dff5cb] to-[#bfdbff] font-bold text-[#395068] ${small ? "h-7 w-7 text-[8px]" : "h-9 w-9 text-[10px]"}`}>
      {initials}
    </span>
  );
}

export function adminInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "AD";
}

export default function AdminShell({
  active,
  title,
  description,
  badge = "PREVIEW MODULE · SAMPLE DATA",
  actions,
  search,
  children,
}: {
  active: AdminModuleId;
  title: string | ((admin: AdminDemoSession) => string);
  description: string;
  badge?: string;
  actions?: ReactNode;
  search?: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminDemoSession | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const session = getDemoAdminSession();
    if (!session) {
      // A printed sheet's QR links to `/admin?order=…`; keep that URL so the order opens after sign-in.
      const next = `${window.location.pathname}${window.location.search}`;
      router.replace(next === "/admin" ? "/admin/login" : `/admin/login?next=${encodeURIComponent(next)}`);
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

  const initials = adminInitials(admin.name);
  const heading = typeof title === "string" ? title : title(admin);

  return (
      <div data-admin-dashboard data-admin-module={active} className="admin-dashboard -mb-16 min-h-screen bg-[#f4f6f9] text-[#171c25] md:mb-0">
        {sidebarOpen && <button type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-[69] bg-[#111820]/50 md:hidden" />}
        <div className="flex min-h-screen">
          <aside className={`fixed inset-y-0 left-0 z-[70] flex w-[224px] shrink-0 flex-col bg-[#11171b] text-white shadow-xl transition-transform duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0 md:shadow-none ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
            <div className="flex h-[72px] items-center justify-between border-b border-white/[0.07] px-5">
              <Link href="/admin" className="flex flex-col leading-none" aria-label="MH Fashion admin dashboard">
                <span className="text-[18px] font-black tracking-tight"><span className="text-[#8bd340]">MH</span> FASHION<span className="text-[#8bd340]">.</span></span>
                <span className="mt-1 text-[9px] font-medium tracking-[0.12em] text-[#8e979e]">SUPER ADMIN · PREVIEW</span>
              </Link>
              <button type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="rounded-lg p-1.5 text-[#b8c0c6] hover:bg-white/10 md:hidden"><X size={18} /></button>
            </div>

            <nav aria-label="Admin navigation" className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
              {NAV.map(({ id, label, href, icon: Icon }) => (
                id === active ? (
                  <Link key={id} href={href} aria-current="page" data-admin-nav={id} onClick={() => setSidebarOpen(false)} className="flex h-10 items-center gap-3 rounded-xl border-l-[3px] border-[#8bd340] bg-[#263a25] px-3 text-[12px] font-semibold text-[#a5ea62] shadow-[inset_0_0_0_1px_rgba(139,211,64,.1)]">
                    <Icon size={17} />{label}
                  </Link>
                ) : (
                  <Link key={id} href={href} data-admin-nav={id} onClick={() => setSidebarOpen(false)} className="flex h-10 items-center gap-3 rounded-xl px-3 text-[12px] font-medium text-[#a6afb5] transition-colors hover:bg-white/[0.06] hover:text-white">
                    <Icon size={17} />{label}
                  </Link>
                )
              ))}
              <div className="mx-2 my-5 border-t border-white/[0.08]" />
              <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3.5">
                <div className="flex items-center gap-2 text-[#a9e269]"><Sparkles size={15} /><span className="text-[11px] font-bold">Create. Print. Wear.</span></div>
                <p className="mt-2 text-[10px] leading-4 text-[#a4adb3]">Make your own style and print it on premium apparel.</p>
                <Link href="/create" className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-[#a9e269] hover:text-white">Open design editor <ArrowRight size={12} /></Link>
              </div>
            </nav>

            <div className="border-t border-white/[0.08] p-3">
              <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
                <AdminAvatar initials={initials} />
                <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-semibold text-white">{admin.name}</p><p className="truncate text-[9px] text-[#7f8b91]">{admin.email}</p></div>
                <button type="button" onClick={handleSignOut} aria-label="Sign out of demo account" title="Sign out" className="rounded-lg p-1.5 text-[#89939a] hover:bg-white/10 hover:text-white"><LogOut size={15} /></button>
              </div>
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <header className="sticky top-0 z-40 flex h-[64px] items-center gap-3 border-b border-[#e8ebef] bg-white/95 px-3 backdrop-blur sm:px-5 lg:px-7">
              <button type="button" aria-label="Open navigation" onClick={() => setSidebarOpen(true)} className="rounded-xl p-2 text-[#566070] hover:bg-[#f2f4f6] md:hidden"><Menu size={19} /></button>
              {search ?? <div className="hidden text-[11px] font-semibold text-[#7b8492] sm:block">{heading}</div>}
              <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2.5">
                <span className="hidden rounded-full bg-[#fff5dd] px-2.5 py-1.5 text-[9px] font-bold tracking-wide text-[#946b12] sm:inline">PREVIEW MODE</span>
                <button type="button" aria-label="Preview notifications" className="relative rounded-full p-2 text-[#505a68] hover:bg-[#f3f5f7]"><Bell size={18} /><span className="absolute right-1 top-1 h-2 w-2 rounded-full border-2 border-white bg-[#f04452]" /></button>
                <button type="button" aria-label="Help" className="hidden rounded-full p-2 text-[#505a68] hover:bg-[#f3f5f7] sm:block"><CircleHelp size={17} /></button>
                <button type="button" aria-label="Language settings" className="hidden rounded-full p-2 text-[#505a68] hover:bg-[#f3f5f7] md:block"><Globe2 size={17} /></button>
                <div className="hidden h-7 border-l border-[#e8ebef] sm:block" />
                <div className="flex items-center gap-2"><AdminAvatar initials={initials} small /><span className="hidden max-w-[110px] truncate text-[11px] font-bold text-[#27303b] sm:block">{admin.name}</span><button type="button" onClick={handleSignOut} aria-label="Sign out of demo account" className="rounded-lg p-1 text-[#87909c] hover:bg-[#f3f5f7]"><LogOut size={14} /></button></div>
              </div>
            </header>

            <main className="mx-auto w-full max-w-[1700px] px-3 pb-8 pt-4 sm:px-5 sm:pt-6 lg:px-7">
              <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                  <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-[#f2dfab] bg-[#fff9e9] px-2.5 py-1 text-[9px] font-bold tracking-wide text-[#927018]"><Sparkles size={12} /> {badge}</div>
                  <h1 className="text-[23px] font-extrabold tracking-tight text-[#171c25] sm:text-[28px]">{heading}</h1>
                  <p className="mt-1 text-[11px] text-[#808a97] sm:text-[12px]">{description}</p>
                </div>
                {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
              </div>

              {children}

              <footer className="mt-6 flex flex-col gap-2 border-t border-[#e5e9ee] pt-4 text-[9px] text-[#929ba7] sm:flex-row sm:items-center sm:justify-between">
                <p><strong className="text-[#4cae22]">MH FASHION.</strong> <span className="ml-1">Admin preview · Sample data only</span></p>
                <p className="flex items-center gap-3"><span>Demo session · local browser only</span><span>·</span><span>© MH Fashion</span></p>
              </footer>
            </main>
          </div>
        </div>
      </div>
  );
}
