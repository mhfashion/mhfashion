import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // All colors read from CSS variables (see globals.css) so the
        // .dark class toggle switches every color app-wide instantly.
        bg: {
          DEFAULT: "rgb(var(--bg) / <alpha-value>)",
          surface: "rgb(var(--bg-surface) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          foreground: "rgb(var(--accent-foreground) / <alpha-value>)",
        },
        border: {
          DEFAULT: "rgb(var(--border) / <alpha-value>)",
          light: "rgb(var(--border-light) / <alpha-value>)",
        },
        text: {
          primary: "rgb(var(--text-primary) / <alpha-value>)",
          secondary: "rgb(var(--text-secondary) / <alpha-value>)",
          muted: "rgb(var(--text-muted) / <alpha-value>)",
          faint: "rgb(var(--text-faint) / <alpha-value>)",
        },
      },
      borderRadius: {
        card: "10px",
        pill: "20px",
      },
      // A phone without a Myanmar font paints every Burmese label as empty boxes, so each platform's own
      // Myanmar face is named before the generic fallback (Plan §17 S7: the interface is labelled in both
      // languages). Order matters: the Latin faces first keep English on the system font.
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Noto Sans Myanmar",
          "Myanmar Sangam MN",
          "Myanmar Text",
          "Padauk",
          "Pyidaungsu",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
