import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        canvas: "var(--canvas)",
        surface: "var(--surface)",
        muted: "var(--muted)",
        ink: "var(--foreground)",
        "ink-muted": "var(--foreground-muted)",
        "ink-subtle": "var(--foreground-subtle)",
        line: "var(--border)",
        brand: "var(--brand)",
        "brand-hover": "var(--brand-hover)",
        "brand-soft": "var(--brand-soft)",
        "brand-container": "var(--brand-container)",
        "secondary-container": "var(--secondary-container)",
        "on-secondary-container": "var(--on-secondary-container)",
        danger: "var(--destructive)",
      },
      boxShadow: {
        lift: "var(--shadow-lift)",
        sidebar: "var(--shadow-sidebar)",
        "card-bento": "var(--shadow-card-bento)",
        panel: "var(--shadow-panel)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius-lg)",
        md: "var(--radius-md)",
        sm: "var(--radius-sm)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(24px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "slide-in-left": {
          "0%": { transform: "translateX(-24px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
      },
      animation: {
        "fade-in": "fade-in 180ms ease-out both",
        "slide-in-right": "slide-in-right 220ms ease-out both",
        "slide-in-left": "slide-in-left 220ms ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
