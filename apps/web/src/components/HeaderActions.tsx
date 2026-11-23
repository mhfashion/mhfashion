"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Heart,
  ShoppingCart,
  User,
  Moon,
  Sun,
  Pencil,
} from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import { useCurrency } from "@/lib/currency-context";
import { useCart } from "@/lib/cart-context";
import { useWishlist } from "@/lib/wishlist-context";
import { useI18n } from "@/lib/i18n";
import NotificationBell from "./NotificationBell";
import CartBox from "./CartBox";
import { CURRENCY_LABEL, CurrencyIcon, FlagIcon, LANGUAGE_LABEL } from "./SwitcherIcons";

export default function HeaderActions() {
  const { theme, toggleTheme } = useTheme();
  const { currency, toggleCurrency } = useCurrency();
  const { itemCount } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { locale, setLocale, t } = useI18n();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const term = searchTerm.trim();
    if (!term) return;
    setSearchOpen(false);
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };
  const [cartOpen, setCartOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const cartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
      if (cartRef.current && !cartRef.current.contains(e.target as Node)) {
        setCartOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex items-center gap-3">
      {/* Inline search field (desktop, lg+): submitting goes to /search */}
      <form
        role="search"
        onSubmit={submitSearch}
        data-header-search="desktop"
        className="hidden lg:flex items-center gap-2 bg-bg-surface border border-border rounded-full px-3 py-1.5 w-56 text-text-secondary focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/40"
      >
        <Search size={15} />
        <input
          type="search"
          name="q"
          aria-label={t("actions.searchProducts")}
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder={t("actions.searchProducts")}
          className="bg-transparent outline-none text-xs w-full placeholder:text-text-faint"
        />
      </form>

      {/* Search icon + dropdown (md–lg, where the inline field is hidden) */}
      <div className="relative lg:hidden" ref={searchRef}>
        <button
          aria-label={t("actions.search")}
          className="text-text-secondary"
          onClick={() => setSearchOpen((s) => !s)}
        >
          <Search size={18} />
        </button>
        {searchOpen && (
          <form
            role="search"
            onSubmit={submitSearch}
            data-header-search="compact"
            className="absolute right-0 top-full mt-3 w-64 bg-bg-surface border border-border rounded-full px-3 py-2 shadow-xl flex items-center gap-2 text-text-secondary z-50 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/40"
          >
            <Search size={15} />
            <input
              autoFocus
              type="search"
              name="q"
              aria-label={t("actions.searchProducts")}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={t("actions.searchProducts")}
              className="bg-transparent outline-none text-xs w-full placeholder:text-text-faint"
            />
          </form>
        )}
      </div>

      <div className="flex items-center gap-3.5 text-text-secondary">
        {/* Language: the flag itself is the state, so the icon is never decoration. */}
        <button
          type="button"
          onClick={() => setLocale(locale === "en" ? "my" : "en")}
          aria-label={`Language: ${LANGUAGE_LABEL[locale]} — switch to ${LANGUAGE_LABEL[locale === "en" ? "my" : "en"]}`}
          title={`Language: ${LANGUAGE_LABEL[locale]}`}
          data-header-language={locale}
          className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-border-light hover:border-accent"
        >
          <FlagIcon locale={locale} />
        </button>
        <NotificationBell />

        <a href="/wishlist" aria-label={wishlistCount ? `${t("actions.wishlist")}, ${wishlistCount} ${t("actions.wishlistItems")}` : t("actions.wishlist")} data-header-wishlist className="relative">
          <Heart size={18} />
          {wishlistCount > 0 ? (
            <span data-wishlist-count className="absolute -right-1.5 -top-1.5 min-w-[14px] rounded-full bg-accent px-1 text-center text-[9px] font-bold leading-[14px] text-accent-foreground">{wishlistCount}</span>
          ) : null}
        </a>

        {/* Currency: notes for Kyat, a dollar coin for USD. Base price is stored in Ks. */}
        <button
          type="button"
          onClick={toggleCurrency}
          aria-label={`${t("actions.currency")}: ${CURRENCY_LABEL[currency]} — switch to ${CURRENCY_LABEL[currency === "Ks" ? "USD" : "Ks"]}`}
          title={`${t("actions.currency")}: ${CURRENCY_LABEL[currency]}`}
          className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-border-light text-accent hover:border-accent"
          data-header-currency={currency}
        >
          <CurrencyIcon currency={currency} size={14} />
        </button>

        <button onClick={toggleTheme} aria-label={t("actions.theme")}>
          {theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        <a
          href="/create"
          aria-label={t("actions.create")}
          className="w-[30px] h-[30px] rounded-full bg-accent text-accent-foreground flex items-center justify-center"
        >
          <Pencil size={15} />
        </a>

        <div ref={cartRef} className="relative">
          <button type="button" onClick={() => setCartOpen((open) => !open)} aria-label={itemCount ? `${t("actions.cart")}, ${itemCount} ${t("actions.cartItems")}` : t("actions.cart")} className="relative">
          <ShoppingCart size={18} />
          {itemCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-accent text-accent-foreground text-[9px] font-bold flex items-center justify-center">
              {itemCount}
            </span>
          )}
          </button>
          {cartOpen && <CartBox onClose={() => setCartOpen(false)} />}
        </div>
        {/* The badge is a picture of a number; this is what a screen reader hears when it changes. */}
        <span className="sr-only" role="status" aria-live="polite">
          {itemCount ? `${itemCount} ${t("actions.cartItems")}` : ""}
        </span>

        <a href="/account" aria-label={t("actions.account")}>
          <User size={18} />
        </a>
      </div>
    </div>
  );
}
