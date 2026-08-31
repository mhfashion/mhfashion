import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Base surfaces (dark-mode-first, per the VOID-inspired reference)
        bg: {
          DEFAULT: "#0d0d0d",
          surface: "#1a1a1a",
        },
        accent: {
          DEFAULT: "#d4ff3f", // neon-lime, matches confirmed mockups
          foreground: "#0d0d0d",
        },
        border: {
          DEFAULT: "#262626",
          light: "#404040",
        },
        text: {
          primary: "#f0f0f0",
          secondary: "#b3b3b3",
          muted: "#8a8a8a",
          faint: "#6a6a6a",
        },
      },
      borderRadius: {
        card: "10px",
        pill: "20px",
      },
    },
  },
  plugins: [],
};

export default config;
