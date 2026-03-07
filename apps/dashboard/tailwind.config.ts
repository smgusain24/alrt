import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0b",
        surface: "#111113",
        elevated: "#18181b",
        "border-default": "rgba(255, 255, 255, 0.06)",
        "border-bright": "rgba(255, 255, 255, 0.12)",
        "text-primary": "#fafafa",
        "text-secondary": "#a1a1aa",
        "text-muted": "#71717a",
        accent: "#3b82f6",
        success: "#22c55e",
        danger: "#ef4444",
        warning: "#f59e0b",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
        brand: ["var(--font-brand)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
        md: "8px",
        lg: "12px",
      },
    },
  },
  plugins: [],
};
export default config;
