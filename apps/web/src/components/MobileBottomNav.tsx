"use client";

import { Flame, Home, Pencil, ShoppingCart, User } from "lucide-react";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";

const ITEMS = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/popular", label: "Popular", Icon: Flame },
  { href: "/create", label: "Create", Icon: Pencil },
  { href: "/cart", label: "Cart", Icon: ShoppingCart },
  { href: "/account", label: "Account", Icon: User },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { locale } = useI18n();
  const labels = locale === "my" ? ["ပင်မ", "Popular", "ဖန်တီးရန်", "Cart", "အကောင့်"] : ITEMS.map((item) => item.label);

  return (
    <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-bg/95 px-2 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_24px_-18px_rgba(0,0,0,0.65)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5">
        {ITEMS.map(({ href, Icon }, index) => {
          const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
          return <a key={href} href={href} aria-current={active ? "page" : undefined} className={`flex flex-col items-center gap-0.5 rounded-xl px-1 py-1 text-[9px] font-semibold transition-colors ${active ? "text-accent" : "text-text-muted"}`}><span className={`flex h-7 w-9 items-center justify-center rounded-full ${active ? "bg-accent/10" : ""}`}><Icon size={18} strokeWidth={active ? 2.5 : 2} /></span>{labels[index]}</a>;
        })}
      </div>
    </nav>
  );
}
