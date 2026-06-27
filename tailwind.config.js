/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // ✅ Added dark mode support (class-based)
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#FFC107",
        secondary: "#212121",
        accent: "#FF9800",
        background: "#F5F5F5",
        surface: "#FFFFFF",
      }
    },
  },
  plugins: [],
}
