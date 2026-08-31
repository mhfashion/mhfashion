export default function Header() {
  // Confirmed structure: Logo | New | Popular | Collections (dropdown) | Guide
  // Right side icons: Search, Notification, Wishlist, Currency (Ks/$), Dark/Light toggle,
  // Create Design (pencil, accent circle), Cart, Account.
  return (
    <header className="flex items-center justify-between px-6 py-3.5 border-b border-border">
      <div className="flex items-center gap-6">
        <span className="font-bold text-base tracking-wide">MH FASHION.</span>
        <nav className="flex gap-5 text-sm text-text-secondary">
          <a href="/new">New</a>
          <a href="/popular">Popular</a>
          <a href="/collections" className="flex items-center gap-1">
            Collections
          </a>
          <a href="/guide">Guide</a>
        </nav>
      </div>
      <div className="flex items-center gap-4 text-text-secondary text-sm">
        {/* TODO: replace with real icon components + working state */}
        <span title="Search">Search</span>
        <span title="Notifications">Bell</span>
        <span title="Wishlist">Heart</span>
        <span title="Currency">Ks</span>
        <span title="Theme toggle">Theme</span>
        <a
          href="/create"
          title="Create design"
          className="w-7 h-7 rounded-full bg-accent text-accent-foreground flex items-center justify-center"
        >
          ✎
        </a>
        <span title="Cart">Cart</span>
        <span title="Account">Account</span>
      </div>
    </header>
  );
}
