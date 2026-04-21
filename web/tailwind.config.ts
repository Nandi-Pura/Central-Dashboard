import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"]
      },
      colors: {
        bg: { primary: "#0a0e1a", secondary: "#0f1629", card: "#131d35", hover: "#1a2540" },
        indigo: { 400: "#818cf8", 500: "#6366f1", 600: "#4f46e5" },
        emerald: { 400: "#34d399", 500: "#10b981" },
        amber: { 400: "#fbbf24", 500: "#f59e0b" },
        rose: { 400: "#f87171", 500: "#ef4444" },
        sky: { 400: "#38bdf8", 500: "#0ea5e9" },
        slate: {
          700: "#334155", 750: "#2a3347", 800: "#1e293b",
          850: "#172033", 900: "#0f172a", 950: "#020617"
        }
      },
      borderRadius: { "2xl": "16px", "3xl": "24px" },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
        "fade-in": "fadeIn 0.3s ease both",
        shimmer: "shimmer 1.5s infinite"
      }
    }
  },
  plugins: []
};

export default config;
