// tailwind.config.js (ESM because package.json has "type": "module")
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    container: { center: true, padding: "16px", screens: { lg: "1200px", xl: "1400px" } },
    extend: {
      colors: {
        brand: {
          DEFAULT: "#046BD9",
          50:  "#eef7ff",
          100: "#d9edff",
          200: "#b8dcff",
          300: "#8ec6ff",
          400: "#5aa8f2",
          500: "#046BD9",
          600: "#055bb8",
          700: "#084a93",
          800: "#0b3f7c",
          900: "#0c3568",
        },
        brand2: "#2504D9",
        brand3: "#0428D9",
        brand4: "#04AED9",
        brand5: "#6B04D9",
        brand6: "#4D64D9",
        app: {
          bg: "#f7f8fb",
          surface: "#ffffff",
          muted: "#f1f3f7",
          border: "#e5e7eb",
          strong: "#111827",
          body: "#334155",
          mutedText: "#64748b",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji"],
      },
      borderRadius: { smx: "8px", mdx: "12px", lgx: "16px" },
      boxShadow: {
        smx: "0 1px 2px rgba(17,24,39,0.06)",
        card: "0 6px 16px rgba(17,24,39,0.08)",
        lgx: "0 12px 30px rgba(17,24,39,0.12)",
      },
      backdropBlur: { xs: "8px" },
      transitionTimingFunction: { easebrand: "cubic-bezier(.2,.6,.2,1)" },
      screens: { "3xl": "1600px" },
    },
  },
  plugins: [],
};
