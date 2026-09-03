"use client";

import {
  Search,
  Bell,
  Heart,
  ShoppingCart,
  User,
  Moon,
  Sun,
  Pencil,
} from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import { useCurrency } from "@/lib/currency-context";

export default function HeaderActions() {
  const { theme, toggleTheme } = useTheme();
  const { currency, toggleCurrency } = useCurrency();

  return (
    <div className="flex items-center gap-3.5 text-text-secondary">
      <button aria-label="Search">
        <Search size={18} />
      </button>
      <button aria-label="Notifications">
        <Bell size={18} />
      </button>
      <button aria-label="Wishlist">
        <Heart size={18} />
      </button>

      {/* Currency switcher — Ks/$ toggle, base price stored in Ks */}
      <button
        onClick={toggleCurrency}
        aria-label="Toggle currency"
        className="text-sm border border-border-light rounded-full px-2.5 py-0.5"
      >
        {currency}
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
      <a href="/cart" aria-label="Cart">
        <ShoppingCart size={18} />
      </a>
      <a href="/account" aria-label="Account">
        <User size={18} />
      </a>
    </div>
  );
}
