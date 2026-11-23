import type { MetadataRoute } from "next";

/**
 * Plan P2 item 15: the shop installs as an app before any native build is considered. The editor is
 * a web canvas, so a PWA keeps one codebase; this manifest is what makes the install prompt appear.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MH Fashion — Design Your Own World",
    short_name: "MH Fashion",
    description: "Design and order custom T-shirts, jerseys, phone covers and more, printed in Myanmar.",
    // The shop is the app; the editor and admin are reached from it, so `/` is the right start.
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0c0c0c",
    theme_color: "#0c0c0c",
    lang: "en",
    dir: "ltr",
    categories: ["shopping", "lifestyle"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // The maskable tile carries extra padding so Android can crop it to any shape.
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Shop", short_name: "Shop", url: "/products", description: "Every product in the shop" },
      { name: "Design your own", short_name: "Create", url: "/create", description: "Open the design editor" },
      { name: "Your orders", short_name: "Orders", url: "/account", description: "Track an order" },
    ],
  };
}
