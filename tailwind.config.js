/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // ✅ Keep existing dark mode support (class-based)
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Enterprise Neutral System (GitHub/Linear inspired)
        neutral: {
          50: "#F9FAFB",
          100: "#F3F4F6",
          200: "#E5E7EB",
          300: "#D1D5DB",
          400: "#9CA3AF",
          500: "#6B7280",
          600: "#4B5563",
          700: "#374151",
          800: "#1F2937",
          900: "#111827",
          950: "#030712",
        },

        // Professional Enterprise Blue (Microsoft/IBM Carbon inspired)
        primary: {
          50: "#F0F7FF",
          100: "#E0EFFF",
          200: "#BBDDFF",
          300: "#7BBFFF",
          400: "#3B9DFF",
          500: "#0062FF", // Deep Professional Blue
          600: "#0052D9",
          700: "#0040B0",
          800: "#003080",
          900: "#002050",
          DEFAULT: "#0062FF",
        },

        // Secondary Indigo (Linear inspired)
        secondary: {
          50: "#F5F3FF",
          100: "#EDE9FE",
          200: "#DDD6FE",
          300: "#C4B5FD",
          400: "#A78BFA",
          500: "#8B5CF6",
          600: "#7C3AED",
          700: "#6D28D9",
          800: "#5B21B6",
          900: "#4C1D95",
          DEFAULT: "#8B5CF6",
        },

        // Semantic Colors
        success: {
          50: "#F0FDF4",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
          DEFAULT: "#10B981",
        },
        warning: {
          50: "#FFFBEB",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
          DEFAULT: "#F59E0B",
        },
        error: {
          50: "#FEF2F2",
          500: "#EF4444",
          600: "#DC2626",
          700: "#B91C1C",
          DEFAULT: "#EF4444",
        },
        info: {
          50: "#F0F9FF",
          500: "#0EA5E9",
          DEFAULT: "#0EA5E9",
        },

        // Override default colors to maintain consistency even with hardcoded classes
        blue: {
          50: "#F0F7FF",
          100: "#E0EFFF",
          200: "#BBDDFF",
          300: "#7BBFFF",
          400: "#3B9DFF",
          500: "#0062FF",
          600: "#0052D9",
          700: "#0040B0",
          800: "#003080",
          900: "#002050",
        },
        indigo: {
          50: "#F5F3FF",
          100: "#EDE9FE",
          200: "#DDD6FE",
          300: "#C4B5FD",
          400: "#A78BFA",
          500: "#8B5CF6",
          600: "#7C3AED",
          700: "#6D28D9",
          800: "#5B21B6",
          900: "#4C1D95",
        },
        slate: {
          50: "#F9FAFB",
          100: "#F3F4F6",
          200: "#E5E7EB",
          300: "#D1D5DB",
          400: "#9CA3AF",
          500: "#6B7280",
          600: "#4B5563",
          700: "#374151",
          800: "#1F2937",
          900: "#111827",
        }
      },
      boxShadow: {
        'enterprise': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        'dropdown': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
      }

    },
  },
  plugins: [],
}
