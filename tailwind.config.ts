import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f3f7ff",
          100: "#e6efff",
          200: "#c5d8ff",
          300: "#9ab8ff",
          400: "#6890ff",
          500: "#3a68f5",
          600: "#264bd1",
          700: "#1f3ba6",
          800: "#1c3380",
          900: "#1a2c66",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
