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
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji"],
      },
      // Keep aspect ratio utilities for the preview component
      aspectRatio: {
        '4/5': '4 / 5',
        '1.91/1': '1.91 / 1',
      },
      screens: { "3xl": "1600px" },
    },
  },
  plugins: [],
};
