import {
  Search,
  Bell,
  Heart,
  ShoppingCart,
  User,
  Moon,
  Pencil,
  ChevronDown,
} from "lucide-react";
import MobileNav from "./MobileNav";

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
      {/* Mobile: hamburger + logo, Search/Notification on the right (client component) */}
      <MobileNav />

      {/* Desktop header */}
      <header className="hidden md:flex items-center justify-between px-6 py-3.5 border-b border-border">
        <div className="flex items-center gap-6">
          <a href="/" className="font-bold text-base tracking-wide">
            MH FASHION.
          </a>
          <nav className="flex items-center gap-4.5 text-sm text-text-secondary">
            <a href="/new" className="hover:text-text-primary">New</a>
            <a href="/popular" className="hover:text-text-primary">Popular</a>

            {/* Collections dropdown (desktop only, per confirmed spec) */}
            <div className="relative group">
              <button className="flex items-center gap-1 hover:text-text-primary">
                Collections <ChevronDown size={13} />
              </button>
              <div className="absolute left-0 top-full pt-2 hidden group-hover:block">
                <div className="bg-bg-surface border border-border rounded-lg p-1.5 w-44 shadow-lg">
                  {COLLECTIONS.map((c) => (
                    <a
                      key={c.href}
                      href={c.href}
                      className="block px-2.5 py-1.5 rounded-md text-sm hover:bg-bg"
                    >
                      {c.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <a href="/guide" className="hover:text-text-primary">Guide</a>
          </nav>
        </div>

        <div className="flex items-center gap-3.5 text-text-secondary">
          <button aria-label="Search"><Search size={18} /></button>
          <button aria-label="Notifications"><Bell size={18} /></button>
          <button aria-label="Wishlist"><Heart size={18} /></button>
          {/* Currency switcher — Ks/$ toggle, base price stored in Ks */}
          <button className="text-sm border border-border-light rounded-full px-2.5 py-0.5">
            Ks
          </button>
          <button aria-label="Toggle theme"><Moon size={18} /></button>
          <a
            href="/create"
            aria-label="Create design"
            className="w-[30px] h-[30px] rounded-full bg-accent text-accent-foreground flex items-center justify-center"
          >
            <Pencil size={15} />
          </a>
          <a href="/cart" aria-label="Cart"><ShoppingCart size={18} /></a>
          <a href="/account" aria-label="Account"><User size={18} /></a>
        </div>
      </header>
    </>
  );
}
