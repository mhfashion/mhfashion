"use client";

import { useEffect } from "react";
import { recordClientError } from "@/lib/error-log";

/**
 * The last resort: this boundary replaces the root layout, so Tailwind and the theme are not guaranteed
 * to be loaded and every style here is inline. It still writes the crash down before the customer leaves.
 */
export default function ShopGlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    recordClientError({
      message: error.message || "The app crashed",
      kind: "global",
      digest: error.digest ?? "",
      stack: error.stack ?? "",
    });
  }, [error]);

  const shell: React.CSSProperties = {
    minHeight: "100vh",
    margin: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0c0c0c",
    color: "#f5f5f5",
    font: "14px/1.6 system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    padding: "24px",
    textAlign: "center",
  };
  const button: React.CSSProperties = {
    borderRadius: 999,
    border: 0,
    padding: "10px 20px",
    background: "#d4ff3f",
    color: "#0c0c0c",
    font: "inherit",
    fontWeight: 700,
    cursor: "pointer",
  };

  return (
    <html lang="en">
      <body style={shell}>
        <main style={{ maxWidth: 420 }}>
          <p style={{ margin: "0 0 8px", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#d4ff3f" }}>MH Fashion</p>
          <h1 style={{ margin: "0 0 10px", fontSize: 22 }}>The shop could not load</h1>
          <p style={{ margin: "0 0 18px", color: "#a3a3a3" }}>
            Something failed before the page could start. Your cart and any design saved on this device are untouched.
          </p>
          <button type="button" onClick={reset} style={button}>Reload the shop</button>
          <p style={{ margin: "16px 0 0", fontSize: 10, color: "#737373" }}>
            The details were saved on this device{error.digest ? ` (reference ${error.digest})` : ""}.
          </p>
        </main>
      </body>
    </html>
  );
}
