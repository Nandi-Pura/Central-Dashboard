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
      colors: {
        statusGreen: "#16a34a",
        statusYellow: "#eab308",
        statusRed: "#dc2626",
        cardBg: "#111827"
      }
    }
  },
  plugins: []
};

export default config;
