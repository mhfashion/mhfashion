import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme-context";
import { CurrencyProvider } from "@/lib/currency-context";
import { CartProvider } from "@/lib/cart-context";

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
          <CurrencyProvider>
            <CartProvider>{children}</CartProvider>
          </CurrencyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
