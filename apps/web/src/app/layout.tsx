import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme-context";
import { CurrencyProvider } from "@/lib/currency-context";
import { CartProvider } from "@/lib/cart-context";
import { LocaleProvider } from "@/lib/i18n";
import CopyrightBar from "@/components/CopyrightBar";
import BrowserZoomGuard from "@/components/BrowserZoomGuard";
import MobileBottomNav from "@/components/MobileBottomNav";

export const metadata: Metadata = {
  title: "MH Fashion — Design Your Own World",
  description:
    "Print-on-demand platform. Design and order custom T-shirts, phone covers, jerseys, and more.",
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
        <ThemeProvider>
          <LocaleProvider>
            <CurrencyProvider>
              <CartProvider>
                <BrowserZoomGuard />
                <div className="flex min-h-screen flex-col pb-16 md:pb-0">
                  <div className="flex-1">{children}</div>
                  <CopyrightBar />
                </div>
                <MobileBottomNav />
              </CartProvider>
            </CurrencyProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
