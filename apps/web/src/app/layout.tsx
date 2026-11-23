import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme-context";
import { CurrencyProvider } from "@/lib/currency-context";
import { CartProvider } from "@/lib/cart-context";
import { WishlistProvider } from "@/lib/wishlist-context";
import { LocaleProvider } from "@/lib/i18n";
import CopyrightBar from "@/components/CopyrightBar";
import BrowserZoomGuard from "@/components/BrowserZoomGuard";
import MobileBottomNav from "@/components/MobileBottomNav";
import JsonLd from "@/components/JsonLd";
import PwaInstall from "@/components/PwaInstall";
import { organizationSchema, websiteSchema } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "MH Fashion — Design Your Own World",
  description:
    "Print-on-demand platform. Design and order custom T-shirts, phone covers, jerseys, and more.",
  // Plan P2 item 15: the shop installs from the browser, so the manifest and icons are declared here.
  manifest: "/manifest.webmanifest",
  applicationName: "MH Fashion",
  appleWebApp: { capable: true, title: "MH Fashion", statusBarStyle: "black-translucent" },
  icons: {
    icon: [{ url: "/favicon-32.png", sizes: "32x32", type: "image/png" }, { url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-rendered as dark by default (matches the confirmed platform
  // default and avoids a flash-of-light on first paint); ThemeProvider
  // reconciles with the user's saved choice right after mount.
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body>
        <JsonLd data={organizationSchema()} />
        <JsonLd data={websiteSchema()} />
        <ThemeProvider>
          <LocaleProvider>
            <CurrencyProvider>
              <WishlistProvider>
                <CartProvider>
                  <BrowserZoomGuard />
                  <PwaInstall />
                  <div className="flex min-h-screen flex-col pb-[var(--mobile-navigation-height,4rem)] md:pb-0">
                    <div className="flex-1">{children}</div>
                    <CopyrightBar />
                  </div>
                  <MobileBottomNav />
                </CartProvider>
              </WishlistProvider>
            </CurrencyProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
