import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
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
    },
  },
  plugins: [],
};

export default config;
