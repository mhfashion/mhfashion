"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Menu, X } from "lucide-react";
import { ADMIN_NAV } from "@/lib/admin-nav";

const SHOP_LINKS = [
  { label: "New", href: "/new" },
  { label: "Popular", href: "/popular" },
  { label: "MH Fashion", href: "/mh-fashion" },
  { label: "Nyein", href: "/nyein" },
  { label: "Guide", href: "/guide" },
  { label: "Wishlist", href: "/wishlist" },
  { label: "Cart", href: "/cart" },
];

const HELP_LINKS = [
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
  { label: "Shipping", href: "/shipping" },
  { label: "Returns", href: "/returns" },
  { label: "Size guide", href: "/size-guide" },
];

/**
 * The storefront's way into the admin: the header's menu button opens this guide drawer, the way a video
 * site hides its sections behind the hamburger. No shop page links to /admin directly.
 */
export default function SiteMenu() {
  const [open, setOpen] = useState(false);
  // The header pill's backdrop blur makes it the containing block of a fixed child, which would trap the
  // drawer inside the pill; it is portalled to <body> once React has mounted on the client.
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    drawerRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="site-menu"
        data-site-menu-button
        className="rounded-full p-1.5 text-text-primary transition-colors hover:bg-bg"
      >
        <Menu size={19} />
      </button>

      {mounted &&
        createPortal(
          <>
            {open && <div className="fixed inset-0 z-[60] bg-black/50" onClick={close} />}
            <div
              ref={drawerRef}
              id="site-menu"
              tabIndex={-1}
              inert={!open}
              data-site-menu
              className={`fixed left-0 top-0 z-[61] h-full w-[82%] max-w-xs overflow-y-auto overscroll-contain border-r border-border bg-bg-surface outline-none transition-transform duration-300 ease-out ${open ? "translate-x-0" : "-translate-x-full"}`}
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <span className="font-bold tracking-wide"><span className="text-accent">MH</span> FASHION.</span>
                <button type="button" onClick={close} aria-label="Close menu" className="rounded-full p-1.5 text-text-secondary hover:bg-bg"><X size={17} /></button>
              </div>

              <nav aria-label="Menu" className="py-2 text-sm">
                <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">Shop</p>
                {SHOP_LINKS.map((link) => (
                  <a key={link.href} href={link.href} onClick={close} className="block px-4 py-2 hover:bg-bg">{link.label}</a>
                ))}

                <p className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">Help</p>
                {HELP_LINKS.map((link) => (
                  <a key={link.href} href={link.href} onClick={close} className="block px-4 py-2 hover:bg-bg">{link.label}</a>
                ))}

                <p className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">Admin</p>
                {ADMIN_NAV.map((entry) => (
                  <a key={entry.id} href={entry.href} onClick={close} data-admin-link={entry.id} className="block px-4 py-2 hover:bg-bg">{entry.label}</a>
                ))}
              </nav>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
