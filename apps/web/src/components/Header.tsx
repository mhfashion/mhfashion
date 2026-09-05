import { ChevronDown } from "lucide-react";
import MobileNav from "./MobileNav";
import HeaderActions from "./HeaderActions";

const COLLECTIONS = [
  { label: "MH Fashion", href: "/mh-fashion" },
  { label: "Singular", href: "/singular" },
  { label: "Kids", href: "/kids" },
  { label: "Streetwear", href: "/streetwear" },
  { label: "Sport", href: "/sport" },
  { label: "Accessories", href: "/accessories" },
];

export default function Header() {
  return (
    <>
      {/* Mobile: hamburger + logo, sticky (handled inside MobileNav) so it stays visible while scrolling */}
      <MobileNav />

      {/* Desktop header — sticky, floating pill style with an accent glow underline */}
      <div className="hidden md:block sticky top-0 z-50 px-4 pt-3">
        <header className="flex items-center justify-between px-6 py-3 border border-border rounded-full bg-bg/95 backdrop-blur shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)] relative">
          <div className="flex items-center gap-6">
            <a href="/" className="font-bold text-base tracking-wide whitespace-nowrap">
              <span className="text-accent">MH</span> FASHION.
            </a>
            <nav className="flex items-center gap-6 text-sm font-semibold text-text-primary">
              <a href="/new" className="hover:text-accent whitespace-nowrap">New</a>
              <a href="/popular" className="hover:text-accent whitespace-nowrap">Popular</a>

              {/* Collections dropdown (desktop only, per confirmed spec) */}
              <div className="relative group">
                <button className="flex items-center gap-1 hover:text-accent">
                  Collections <ChevronDown size={13} />
                </button>
                <div className="absolute left-0 top-full pt-2 hidden group-hover:block">
                  <div className="bg-bg-surface border border-border rounded-lg p-1.5 w-44 shadow-lg">
                    {COLLECTIONS.map((c) => (
                      <a
                        key={c.href}
                        href={c.href}
                        className="block px-2.5 py-1.5 rounded-md text-sm font-medium hover:bg-bg hover:text-accent"
                      >
                        {c.label}
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              <a href="/guide" className="hover:text-accent">Guide</a>
            </nav>
          </div>

          <HeaderActions cartCount={2} hasNotification />

          {/* Subtle accent glow beneath the pill, matching the reference */}
          <div className="absolute left-6 right-6 -bottom-1.5 h-1.5 bg-accent/40 blur-md rounded-full -z-10" />
        </header>
      </div>
    </>
  );
}
