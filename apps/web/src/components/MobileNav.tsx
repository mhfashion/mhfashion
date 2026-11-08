"use client";

import { useState } from "react";
import {
  Menu,
  Search,
  Heart,
  User,
  DollarSign,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import { useCurrency } from "@/lib/currency-context";
import { useI18n } from "@/lib/i18n";
import NotificationBell from "./NotificationBell";

const NAV_LINKS = [
  { label: "New", href: "/new" },
  { label: "MH Fashion", href: "/mh-fashion" },
  { label: "Nyein", href: "/nyein" },
  { label: "Guide", href: "/guide" },
];

const COLLECTION_LINKS = [
  { label: "T-Shirt", href: "/collections?category=t-shirts" },
  { label: "Cup", href: "/collections?category=cups" },
  { label: "Kids", href: "/collections?category=kids" },
  { label: "Phone Covers", href: "/collections?category=phone-covers" },
  { label: "Bags", href: "/collections?category=bags" },
  { label: "Hoodies", href: "/collections?category=hoodies" },
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
  const { locale, setLocale, t } = useI18n();
  const close = () => setOpen(false);

  return (
    <>
      {/* Top bar — always on top, fixed height (h-14) used to position the
          drawer/backdrop directly beneath it. */}
      <div className="flex md:hidden items-center justify-between h-14 px-4 border-b border-border bg-bg sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <button onClick={() => setOpen((o) => !o)} aria-label={t("actions.toggleMenu")}>
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
        <nav className="text-sm pt-1">
          {NAV_LINKS.map((link) => (
            <LinkRow key={link.href} {...link} onClick={close} />
          ))}

          <div className="flex items-center justify-between border-b border-border/40 px-4 py-2.5 text-xs">
            <span className="text-text-muted">Language</span>
            <div className="flex items-center gap-1.5 font-semibold">
              <button type="button" onClick={() => setLocale("en")} className={locale === "en" ? "text-accent" : "text-text-secondary"}>EN</button>
              <span className="text-border-light">/</span>
              <button type="button" onClick={() => setLocale("my")} className={locale === "my" ? "text-accent" : "text-text-secondary"}>MM</button>
            </div>
          </div>

          <GroupHeading>Collections</GroupHeading>
          {COLLECTION_LINKS.map((link) => (
            <LinkRow key={link.href} {...link} onClick={close} />
          ))}

          <a
            href="/wishlist"
            onClick={close}
            className="flex items-center gap-2 px-4 py-2.5 border-b border-border/40"
          >
            <Heart size={15} /> {t("actions.wishlist")}
          </a>
          <button
            onClick={toggleCurrency}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-left border-b border-border/40"
          >
            <DollarSign size={15} /> {t("actions.currency")}: {currency}
          </button>
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-left border-b border-border/40"
          >
            {theme === "dark" ? <Moon size={15} /> : <Sun size={15} />}{" "}
            {theme === "dark" ? t("actions.darkMode") : t("actions.lightMode")}
          </button>

          {/* Footer-equivalent groups, mirrored here for quick access */}
          <GroupHeading>{t("footer.help")}</GroupHeading>
          {HELP_LINKS.map((link) => (
            <LinkRow key={link.href} {...link} onClick={close} />
          ))}

          <GroupHeading>{t("footer.legal")}</GroupHeading>
          {LEGAL_LINKS.map((link) => (
            <LinkRow key={link.href} {...link} onClick={close} />
          ))}

          <GroupHeading>{t("footer.newsletter")}</GroupHeading>
          <div className="px-4 pb-3">
            <p className="text-[10px] text-text-muted mb-2">
              {t("footer.discount")}
            </p>
            <form className="flex gap-1.5">
              <input
                type="email"
                placeholder={t("footer.email")}
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

          <GroupHeading>{t("footer.myanmarPayment")}</GroupHeading>
          <div className="flex flex-wrap gap-1.5 px-4 pb-3 text-[9px] text-text-secondary">
            <span className="border border-border-light rounded px-1.5 py-0.5">KBZPay</span>
            <span className="border border-border-light rounded px-1.5 py-0.5">Wave Pay</span>
            <span className="border border-border-light rounded px-1.5 py-0.5">AYA Pay</span>
          </div>

          <GroupHeading>{t("footer.download")}</GroupHeading>
          <div className="flex gap-1.5 px-4 pb-3">
            <a href="#" className="border border-border-light rounded px-2.5 py-1 text-[9px]">
              App Store
            </a>
            <a href="#" className="border border-border-light rounded px-2.5 py-1 text-[9px]">
              Google Play
            </a>
          </div>

          <GroupHeading>{t("footer.internationalPayment")}</GroupHeading>
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
            <User size={15} /> {t("actions.account")}
          </a>

          <p className="text-[9px] text-text-faint text-center px-4 pb-5 pt-2">
            © {new Date().getFullYear()} MH Fashion. All rights reserved.
          </p>
        </nav>
      </div>
    </>
  );
}
