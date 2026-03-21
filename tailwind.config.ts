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
        "brand-soft": "var(--brand-soft)",
        danger: "var(--destructive)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        lift: "var(--shadow-lift)",
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
