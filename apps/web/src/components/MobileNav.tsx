"use client";

import { useState } from "react";
import {
  Menu,
  X,
  Search,
  Bell,
  Heart,
  ShoppingCart,
  User,
  DollarSign,
  Moon,
  Sun,
  Pencil,
} from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import { useCurrency } from "@/lib/currency-context";

const NAV_LINKS = [
  { label: "New", href: "/new" },
  { label: "Popular", href: "/popular" },
  { label: "MH Fashion", href: "/mh-fashion" },
  { label: "Singular", href: "/singular" },
  { label: "Kids", href: "/kids" },
  { label: "Streetwear", href: "/streetwear" },
  { label: "Sport", href: "/sport" },
  { label: "Accessories", href: "/accessories" },
  { label: "Guide", href: "/guide" },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { currency, toggleCurrency } = useCurrency();

  return (
    <>
      <div className="flex md:hidden items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <button onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <span className="font-bold text-sm">MH FASHION.</span>
        </div>
        <div className="flex items-center gap-3 text-text-secondary">
          <Search size={17} />
          <Bell size={17} />
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-bg md:hidden">
          <div className="flex justify-end p-4">
            <button onClick={() => setOpen(false)} aria-label="Close menu">
              <X size={22} />
            </button>
          </div>
          <nav className="flex flex-col px-4 gap-1 text-sm">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="py-2.5 border-b border-border/50"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}

            {/* Create Design — placed right below Guide, per confirmed spec */}
            <a
              href="/create"
              className="py-2.5 text-accent font-semibold flex items-center gap-2"
            >
              <Pencil size={15} /> Create design
            </a>

            <div className="border-t border-border my-2" />

            <a href="/wishlist" className="py-2.5 flex items-center gap-2">
              <Heart size={15} /> Wishlist
            </a>
            <a href="/cart" className="py-2.5 flex items-center gap-2">
              <ShoppingCart size={15} /> Cart
            </a>
            <button
              onClick={toggleCurrency}
              className="py-2.5 flex items-center gap-2 text-left"
            >
              <DollarSign size={15} /> Currency: {currency}
            </button>
            <button
              onClick={toggleTheme}
              className="py-2.5 flex items-center gap-2 text-left"
            >
              {theme === "dark" ? <Moon size={15} /> : <Sun size={15} />}{" "}
              {theme === "dark" ? "Dark mode" : "Light mode"}
            </button>

            <div className="border-t border-border my-2" />

            <a href="/terms" className="py-2 text-xs text-text-secondary">
              Terms of use
            </a>
            <a href="/privacy" className="py-2 text-xs text-text-secondary">
              Privacy policy
            </a>
            <a href="/faq" className="py-2 text-xs text-text-secondary">
              FAQ
            </a>

            <div className="border-t border-border my-2" />

            <div className="flex gap-4 py-2 text-text-secondary">
              {/* Social icons — placeholders until real links are provided */}
              <span>FB</span>
              <span>IG</span>
              <span>TikTok</span>
            </div>

            <a
              href="/account"
              className="py-2.5 font-semibold flex items-center gap-2"
            >
              <User size={15} /> Account
            </a>
          </nav>
        </div>
      )}
    </>
  );
}
