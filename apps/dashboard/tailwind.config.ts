import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    borderRadius: {
      none: "0",
      DEFAULT: "0",
      sm: "0",
      md: "0",
      lg: "0",
      xl: "0",
      "2xl": "0",
      "3xl": "0",
      full: "0",
    },
    extend: {
      colors: {
        background: "#FFFFFF",
        surface: "#F5F5F5",
        foreground: "#000000",
        muted: "#808080",
        accent: "#0000FF",
        danger: "#FF0000",
        success: "#00AA00",
        warning: "#FFCC00",
        navy: "#000080",
        "navy-light": "#1084D0",
        "bevel-light": "#FFFFFF",
        "bevel-dark": "#808080",
        "bevel-darker": "#404040",
        "bevel-lighter": "#DFDFDF",
        "panel-yellow": "#FFFFCC",
        "row-alt": "#E8E8E8",
        "link-visited": "#800080",
      },
      fontFamily: {
        heading: ['"Arial Black"', "Impact", "Haettenschweiler", "sans-serif"],
        body: ["Inter", '"Segoe UI"', "Tahoma", "Geneva", "Verdana", "sans-serif"],
        mono: ['"Courier New"', "Courier", "monospace"],
      },
      animation: {
        rainbow: "rainbow 4s linear infinite",
        "pulse-glow": "pulse-glow 1.5s ease-in-out infinite",
        blink: "blink 1s step-end infinite",
      },
      keyframes: {
        rainbow: {
          "0%": { color: "#ff0000" },
          "17%": { color: "#ff8000" },
          "33%": { color: "#ffff00" },
          "50%": { color: "#00ff00" },
          "67%": { color: "#0080ff" },
          "83%": { color: "#8000ff" },
          "100%": { color: "#ff0000" },
        },
        "pulse-glow": {
          "0%, 100%": {
            transform: "scale(1)",
            boxShadow: "0 0 0 0 rgba(255, 0, 0, 0.7)",
          },
          "50%": {
            transform: "scale(1.05)",
            boxShadow: "0 0 10px 2px rgba(255, 0, 0, 0.5)",
          },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
