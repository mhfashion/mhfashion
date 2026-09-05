"use client";

import { useState } from "react";
import {
  Search,
  Bell,
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

export default function HeaderActions({
  cartCount = 0,
  hasNotification = false,
}: {
  cartCount?: number;
  hasNotification?: boolean;
}) {
  const { theme, toggleTheme } = useTheme();
  const { currency, toggleCurrency } = useCurrency();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="flex items-center gap-3">
      {/* Inline search field (desktop) */}
      <div className="hidden lg:flex items-center gap-2 bg-bg-surface border border-border rounded-full px-3 py-1.5 w-56 text-text-secondary">
        <Search size={15} />
        <input
          type="text"
          placeholder="Search products..."
          className="bg-transparent outline-none text-xs w-full placeholder:text-text-faint"
        />
      </div>
      {/* Search icon only (below lg) */}
      <button
        aria-label="Search"
        className="lg:hidden text-text-secondary"
        onClick={() => setSearchOpen((s) => !s)}
      >
        <Search size={18} />
      </button>

      <div className="flex items-center gap-3.5 text-text-secondary">
        <button aria-label="Notifications" className="relative">
          <Bell size={18} />
          {hasNotification && (
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-accent" />
          )}
        </button>

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
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-accent text-accent-foreground text-[9px] font-bold flex items-center justify-center">
              {cartCount}
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
