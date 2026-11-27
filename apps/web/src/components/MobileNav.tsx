"use client";

import { useEffect, useRef, useState } from "react";
import {
  Menu,
  Search,
  Heart,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import { useCurrency } from "@/lib/currency-context";
import { useI18n } from "@/lib/i18n";
import { useWishlist } from "@/lib/wishlist-context";
import HeaderSearchSuggestions, { useSuggestionsFocus } from "./HeaderSearchSuggestions";
import NotificationBell from "./NotificationBell";
import { CurrencyIcon, FlagIcon, LANGUAGE_LABEL } from "./SwitcherIcons";

const NAV_LINKS = [
  { labelKey: "nav.new", href: "/new" },
  { labelKey: "nav.mhFashion", href: "/mh-fashion" },
  { labelKey: "nav.nyein", href: "/nyein" },
  { labelKey: "nav.guide", href: "/guide" },
];

const COLLECTION_LINKS = [
  { labelKey: "nav.tShirts", href: "/collections?category=t-shirts" },
  { labelKey: "nav.cups", href: "/collections?category=cups" },
  { labelKey: "nav.kids", href: "/collections?category=kids" },
  { labelKey: "nav.phoneCovers", href: "/collections?category=phone-covers" },
  { labelKey: "nav.bags", href: "/collections?category=bags" },
  { labelKey: "nav.hoodies", href: "/collections?category=hoodies" },
];

const HELP_LINKS = [
  { labelKey: "nav.faq", href: "/faq" },
  { labelKey: "nav.contact", href: "/contact" },
  { labelKey: "nav.shipping", href: "/shipping" },
  { labelKey: "nav.returns", href: "/returns" },
  { labelKey: "nav.sizeGuide", href: "/size-guide" },
];

const LEGAL_LINKS = [
  { labelKey: "nav.about", href: "/about" },
  { labelKey: "nav.terms", href: "/terms" },
  { labelKey: "nav.privacy", href: "/privacy" },
  { labelKey: "nav.cookies", href: "/cookie-policy" },
];

function GroupHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-text-muted px-4 pt-4 pb-1">
      {children}
    </p>
  );
}

function LinkRow({
  labelKey,
  href,
  onClick,
}: {
  labelKey: string;
  href: string;
  onClick: () => void;
}) {
  const { t } = useI18n();
  return (
    <a
      href={href}
      onClick={onClick}
      className="block px-4 py-2 text-sm border-b border-border/40 last:border-0"
    >
      {t(labelKey)}
    </a>
  );
}

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const suggestions = useSuggestionsFocus();
  const drawerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const { theme, toggleTheme } = useTheme();
  const { currency, toggleCurrency } = useCurrency();
  const { locale, setLocale, t } = useI18n();
  const { count: wishlistCount } = useWishlist();
  const close = () => setOpen(false);

  // The drawer stays in the DOM so it can slide, which would leave its links in the tab order while
  // it is off-screen. Escape closes it, focus moves into it on open, and Tab wraps inside it.
  useEffect(() => {
    if (!open) return;
    const drawer = drawerRef.current;
    drawer?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (event.key !== "Tab" || !drawer) return;
      const focusable = [...drawer.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])')]
        .filter((element) => element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      {/* Top bar — always on top, fixed height (h-14) used to position the
          drawer/backdrop directly beneath it. */}
      <div className="relative flex md:hidden items-center justify-between h-14 px-4 border-b border-border bg-bg sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <button
            ref={menuButtonRef}
            onClick={() => setOpen((o) => !o)}
            aria-label={t("actions.toggleMenu")}
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            <Menu size={20} />
          </button>
          <span className="text-sm font-bold leading-none">
            <span className="text-accent">MH</span> FASHION.
          </span>
        </div>
        <div className="flex items-center gap-3 text-text-secondary">
          <button type="button" aria-label={t("actions.search")} onClick={() => setSearchOpen((value) => !value)}>
            <Search size={17} />
          </button>
          <NotificationBell />
        </div>
        {searchOpen && (
          <form action="/search" method="get" role="search" data-header-search="mobile" className="absolute left-3 right-3 top-full z-[60] mt-2 flex h-10 items-center gap-2 rounded-full border border-border bg-bg-surface px-3 shadow-xl">
            <Search size={15} className="text-text-muted" />
            <input
              autoFocus
              name="q"
              type="search"
              aria-label={t("actions.searchProducts")}
              placeholder={t("actions.searchProducts")}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onFocus={suggestions.onFocus}
              onBlur={suggestions.onBlur}
              className="w-full bg-transparent text-xs leading-none outline-none placeholder:text-text-faint"
            />
            {suggestions.focused ? (
              <HeaderSearchSuggestions
                query={searchTerm}
                onPick={() => {
                  suggestions.close();
                  setSearchOpen(false);
                  setSearchTerm("");
                }}
              />
            ) : null}
          </form>
        )}
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
        ref={drawerRef}
        id="mobile-menu"
        tabIndex={-1}
        inert={!open}
        className={`fixed left-0 bottom-0 top-14 z-40 w-[82%] max-w-xs bg-bg border-r border-border outline-none md:hidden
          transition-transform duration-300 ease-out overflow-y-auto
          ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <nav className="text-sm pt-1">
          {NAV_LINKS.map((link) => (
            <LinkRow key={link.href} {...link} onClick={close} />
          ))}

          <div className="flex items-center justify-between border-b border-border/40 px-4 py-2.5 text-xs">
            <span className="text-text-muted">{t("nav.language")}</span>
            <div className="flex items-center gap-1.5" data-header-language={locale}>
              {(["en", "my"] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLocale(code)}
                  aria-label={`Language: ${LANGUAGE_LABEL[code]}`}
                  aria-pressed={locale === code}
                  className={`flex h-6 w-6 items-center justify-center rounded-full border ${locale === code ? "border-accent bg-accent/10" : "border-border-light opacity-60"}`}
                >
                  <FlagIcon locale={code} />
                </button>
              ))}
            </div>
          </div>

          <GroupHeading>{t("nav.collectionsPlural")}</GroupHeading>
          {COLLECTION_LINKS.map((link) => (
            <LinkRow key={link.href} {...link} onClick={close} />
          ))}

          <a
            href="/wishlist"
            onClick={close}
            className="flex items-center gap-2 px-4 py-2.5 border-b border-border/40"
          >
            <Heart size={15} /> {t("actions.wishlist")}
            {wishlistCount ? <span className="text-text-muted">· {wishlistCount}</span> : null}
          </a>
          <button
            onClick={toggleCurrency}
            data-header-currency={currency}
            aria-label={`${t("actions.currency")}: ${currency === "Ks" ? "Kyat (Ks)" : "US dollar ($)"} — switch`}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-left border-b border-border/40"
          >
            <span className="text-accent"><CurrencyIcon currency={currency} size={15} /></span> {t("actions.currency")}
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

                aria-label={t("footer.email")}
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
            <span className="inline-flex h-5 items-center rounded border border-border-light px-1.5 leading-none">KBZPay</span>
            <span className="inline-flex h-5 items-center rounded border border-border-light px-1.5 leading-none">Wave Pay</span>
            <span className="inline-flex h-5 items-center rounded border border-border-light px-1.5 leading-none">AYA Pay</span>
          </div>

          <GroupHeading>{t("footer.download")}</GroupHeading>
          <div className="flex gap-1.5 px-4 pb-3">
            <a href="#" className="inline-flex h-6 items-center rounded border border-border-light px-2.5 text-[9px] leading-none">
              App Store
            </a>
            <a href="#" className="inline-flex h-6 items-center rounded border border-border-light px-2.5 text-[9px] leading-none">
              Google Play
            </a>
          </div>

          <GroupHeading>{t("footer.internationalPayment")}</GroupHeading>
          <div className="flex flex-wrap gap-1.5 px-4 pb-4 text-[9px] text-text-secondary">
            <span className="inline-flex h-5 items-center rounded border border-border-light px-1.5 leading-none">Visa</span>
            <span className="inline-flex h-5 items-center rounded border border-border-light px-1.5 leading-none">Mastercard</span>
          </div>

          <div className="border-t border-border" />
          <p className="px-4 pb-5 pt-3 text-center text-[9px] text-text-faint">
            © {new Date().getFullYear()} MH Fashion. All rights reserved.
          </p>
        </nav>
      </div>
    </>
  );
}
