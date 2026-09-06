"use client";

import { useEffect, useRef, useState } from "react";
import {
  Search,
  Heart,
  ShoppingCart,
  User,
  Moon,
  Sun,
  Pencil,
  ChevronDown,
} from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import { useCurrency } from "@/lib/currency-context";
import { useCart } from "@/lib/cart-context";
import NotificationBell from "./NotificationBell";

export default function HeaderActions() {
  const { theme, toggleTheme } = useTheme();
  const { currency, toggleCurrency } = useCurrency();
  const { itemCount } = useCart();
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex items-center gap-3">
      {/* Inline search field (desktop, lg+) */}
      <div className="hidden lg:flex items-center gap-2 bg-bg-surface border border-border rounded-full px-3 py-1.5 w-56 text-text-secondary">
        <Search size={15} />
        <input
          type="text"
          placeholder="Search products..."
          className="bg-transparent outline-none text-xs w-full placeholder:text-text-faint"
        />
      </div>

      {/* Search icon + dropdown (md–lg, where the inline field is hidden) */}
      <div className="relative lg:hidden" ref={searchRef}>
        <button
          aria-label="Search"
          className="text-text-secondary"
          onClick={() => setSearchOpen((s) => !s)}
        >
          <Search size={18} />
        </button>
        {searchOpen && (
          <div className="absolute right-0 top-full mt-3 w-64 bg-bg-surface border border-border rounded-full px-3 py-2 shadow-xl flex items-center gap-2 text-text-secondary z-50">
            <Search size={15} />
            <input
              autoFocus
              type="text"
              placeholder="Search products..."
              className="bg-transparent outline-none text-xs w-full placeholder:text-text-faint"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-3.5 text-text-secondary">
        <NotificationBell />

        <button aria-label="Wishlist">
          <Heart size={18} />
        </button>

        {/* Currency switcher — Ks/$ toggle, base price stored in Ks */}
        <button
          onClick={toggleCurrency}
          aria-label="Toggle currency"
          className="flex items-center gap-1 text-xs font-medium border border-border-light rounded-full px-2.5 py-1"
        >
          {currency} <ChevronDown size={12} />
        </button>

        <button onClick={toggleTheme} aria-label="Toggle theme">
          {theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        <a
          href="/create"
          aria-label="Create design"
          className="w-[30px] h-[30px] rounded-full bg-accent text-accent-foreground flex items-center justify-center"
        >
          <Pencil size={15} />
        </a>

        <a href="/cart" aria-label="Cart" className="relative">
          <ShoppingCart size={18} />
          {itemCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-accent text-accent-foreground text-[9px] font-bold flex items-center justify-center">
              {itemCount}
            </span>
          )}
        </a>

        <a href="/account" aria-label="Account">
          <User size={18} />
        </a>
      </div>
    </div>
  );
}
