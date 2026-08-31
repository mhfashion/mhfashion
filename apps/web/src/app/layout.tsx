import type { Metadata } from "next";
import "./globals.css";

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
  // Dark mode is the confirmed default theme; a client-side toggle
  // will add/remove the "dark" class and persist the choice per user.
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
