export default function Footer() {
  return (
    <footer className="px-6 md:px-8 py-6 border-t border-border mt-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-5 pb-5 border-b border-border">
        <div className="col-span-2 md:col-span-1">
          <p className="font-bold text-sm mb-2">MH FASHION.</p>
          <p className="text-[10px] text-text-muted leading-relaxed">
            Print-on-demand for those who don&apos;t follow the crowd. Design
            it your way.
          </p>
          <div className="flex gap-2.5 mt-3 text-text-secondary text-xs">
            <span>FB</span>
            <span>IG</span>
            <span>TikTok</span>
            <span>YT</span>
          </div>
        </div>

        <div>
          <p className="text-[10px] font-semibold text-text-muted mb-2">SHOP</p>
          <ul className="text-[10px] space-y-1.5">
            <li><a href="/products">All Products</a></li>
            <li><a href="/new">New Arrivals</a></li>
            <li><a href="/best-sellers">Best Sellers</a></li>
            <li><a href="/collections">Collections</a></li>
          </ul>
        </div>

        <div>
          <p className="text-[10px] font-semibold text-text-muted mb-2">HELP</p>
          <ul className="text-[10px] space-y-1.5">
            <li><a href="/faq">FAQ</a></li>
            <li><a href="/shipping">Shipping Info</a></li>
            <li><a href="/returns">Returns & Exchanges</a></li>
            <li><a href="/size-guide">Size Guide</a></li>
          </ul>
        </div>

        <div>
          <p className="text-[10px] font-semibold text-text-muted mb-2">ABOUT</p>
          <ul className="text-[10px] space-y-1.5">
            <li><a href="/about">About Us</a></li>
            <li><a href="/terms">Terms of Use</a></li>
            <li><a href="/privacy">Privacy Policy</a></li>
            <li><a href="/contact">Contact Us</a></li>
          </ul>
        </div>

        <div className="col-span-2 md:col-span-1">
          <p className="text-[10px] font-semibold text-text-muted mb-2">
            NEWSLETTER
          </p>
          <p className="text-[9px] text-text-muted mb-2">
            Get 10% off your first order
          </p>
          <form className="flex gap-1.5">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 bg-bg-surface rounded-md h-6 px-2 text-[9px] text-text-primary placeholder:text-text-faint"
            />
            <button
              type="submit"
              aria-label="Subscribe"
              className="w-6 h-6 bg-accent rounded-md text-accent-foreground text-xs"
            >
              →
            </button>
          </form>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-4">
        <p className="text-[9px] text-text-faint">
          © {new Date().getFullYear()} MH Fashion. All rights reserved.
        </p>
        <div className="flex gap-2 text-[9px] text-text-secondary">
          <span className="border border-border-light rounded px-1.5 py-0.5">Visa</span>
          <span className="border border-border-light rounded px-1.5 py-0.5">KBZPay</span>
          <span className="border border-border-light rounded px-1.5 py-0.5">Wave Pay</span>
          <span className="border border-border-light rounded px-1.5 py-0.5">AYA Pay</span>
        </div>
      </div>
    </footer>
  );
}
