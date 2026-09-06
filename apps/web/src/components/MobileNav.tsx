"use client";

import { useState } from "react";
import {
  Menu,
  X,
  Search,
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
import NotificationBell from "./NotificationBell";

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

const SHOP_LINKS = [
  { label: "All Products", href: "/products" },
  { label: "New Arrivals", href: "/new" },
  { label: "Best Sellers", href: "/best-sellers" },
  { label: "Collections", href: "/collections" },
];

const HELP_LINKS = [
  { label: "FAQ", href: "/faq" },
  { label: "Contact Form", href: "/contact" },
  { label: "Shipping Info", href: "/shipping" },
  { label: "Returns & Exchanges", href: "/returns" },
  { label: "Size Guide", href: "/size-guide" },
];

const LEGAL_LINKS = [
  { label: "About Us", href: "/about" },
  { label: "Terms of Use", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Cookie Policy", href: "/cookie-policy" },
];

function GroupHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-text-muted px-4 pt-4 pb-1">
      {children}
    </p>
  );
}

function LinkRow({
  label,
  href,
  onClick,
}: {
  label: string;
  href: string;
  onClick: () => void;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      className="block px-4 py-2 text-sm border-b border-border/40 last:border-0"
    >
      {label}
    </a>
  );
}

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { currency, toggleCurrency } = useCurrency();
  const close = () => setOpen(false);

  return (
    <>
      {/* Top bar — always on top, fixed height (h-14) used to position the
          drawer/backdrop directly beneath it. */}
      <div className="flex md:hidden items-center justify-between h-14 px-4 border-b border-border bg-bg sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <button onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <span className="font-bold text-sm">
            <span className="text-accent">MH</span> FASHION.
          </span>
        </div>
        <div className="flex items-center gap-3 text-text-secondary">
          <Search size={17} />
          <NotificationBell />
        </div>
      </div>

      {/* Backdrop — dims the page below the header, closes the drawer on click */}
      {open && (
        <div
          className="fixed left-0 right-0 bottom-0 top-14 z-40 bg-black/50 md:hidden"
          onClick={close}
        />
      )}

      {/* Side drawer — slides in from the left, sits below the header,
          does NOT cover the full screen; scrollable (drag up/down). */}
      <div
        className={`fixed left-0 bottom-0 top-14 z-40 w-[82%] max-w-xs bg-bg border-r border-border md:hidden
          transition-transform duration-300 ease-out overflow-y-auto
          ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-xs font-semibold text-text-muted">MENU</span>
          <button onClick={close} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className="text-sm">
          {NAV_LINKS.map((link) => (
            <LinkRow key={link.href} {...link} onClick={close} />
          ))}

          {/* Create Design — right below Guide, per confirmed spec */}
          <a
            href="/create"
            onClick={close}
            className="flex items-center gap-2 px-4 py-2.5 text-accent font-semibold border-b border-border/40"
          >
            <Pencil size={15} /> Create design
          </a>

          <a
            href="/wishlist"
            onClick={close}
            className="flex items-center gap-2 px-4 py-2.5 border-b border-border/40"
          >
            <Heart size={15} /> Wishlist
          </a>
          <a
            href="/cart"
            onClick={close}
            className="flex items-center gap-2 px-4 py-2.5 border-b border-border/40"
          >
            <ShoppingCart size={15} /> Cart
          </a>
          <button
            onClick={toggleCurrency}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-left border-b border-border/40"
          >
            <DollarSign size={15} /> Currency: {currency}
          </button>
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-left border-b border-border/40"
          >
            {theme === "dark" ? <Moon size={15} /> : <Sun size={15} />}{" "}
            {theme === "dark" ? "Dark mode" : "Light mode"}
          </button>

          {/* Footer-equivalent groups, mirrored here for quick access */}
          <GroupHeading>SHOP</GroupHeading>
          {SHOP_LINKS.map((link) => (
            <LinkRow key={link.href} {...link} onClick={close} />
          ))}

          <GroupHeading>HELP</GroupHeading>
          {HELP_LINKS.map((link) => (
            <LinkRow key={link.href} {...link} onClick={close} />
          ))}

          <GroupHeading>LEGAL</GroupHeading>
          {LEGAL_LINKS.map((link) => (
            <LinkRow key={link.href} {...link} onClick={close} />
          ))}

          <GroupHeading>NEWSLETTER</GroupHeading>
          <div className="px-4 pb-3">
            <p className="text-[10px] text-text-muted mb-2">
              Get 10% off your first order
            </p>
            <form className="flex gap-1.5">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 bg-bg-surface rounded-md h-7 px-2 text-[10px] placeholder:text-text-faint"
              />
              <button
                type="submit"
                aria-label="Subscribe"
                className="w-7 h-7 bg-accent rounded-md text-accent-foreground text-xs flex-shrink-0"
              >
                →
              </button>
            </form>
          </div>

          <GroupHeading>MYANMAR PAYMENT</GroupHeading>
          <div className="flex flex-wrap gap-1.5 px-4 pb-3 text-[9px] text-text-secondary">
            <span className="border border-border-light rounded px-1.5 py-0.5">KBZPay</span>
            <span className="border border-border-light rounded px-1.5 py-0.5">Wave Pay</span>
            <span className="border border-border-light rounded px-1.5 py-0.5">AYA Pay</span>
          </div>

          <GroupHeading>DOWNLOAD OUR APP</GroupHeading>
          <div className="flex gap-1.5 px-4 pb-3">
            <a href="#" className="border border-border-light rounded px-2.5 py-1 text-[9px]">
              App Store
            </a>
            <a href="#" className="border border-border-light rounded px-2.5 py-1 text-[9px]">
              Google Play
            </a>
          </div>

          <GroupHeading>INTERNATIONAL PAYMENT</GroupHeading>
          <div className="flex flex-wrap gap-1.5 px-4 pb-4 text-[9px] text-text-secondary">
            <span className="border border-border-light rounded px-1.5 py-0.5">Visa</span>
            <span className="border border-border-light rounded px-1.5 py-0.5">Mastercard</span>
          </div>

          <div className="border-t border-border" />

          <a
            href="/account"
            onClick={close}
            className="flex items-center gap-2 px-4 py-3 font-semibold"
          >
            <User size={15} /> Account
          </a>

          <p className="text-[9px] text-text-faint text-center px-4 pb-5 pt-2">
            © {new Date().getFullYear()} MH Fashion. All rights reserved.
          </p>
        </nav>
      </div>
    </>
  );
}
