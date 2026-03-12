/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#6C5CE7", 50: "#F0EEFB", 100: "#E0DCFA", 500: "#6C5CE7", 600: "#5A4BD6", 700: "#4839C5" },
        accent: { DEFAULT: "#FF6B6B", 500: "#FF6B6B" },
        success: { DEFAULT: "#00B894", 500: "#00B894" },
        warning: { DEFAULT: "#FDCB6E", 500: "#FDCB6E" },
        danger: { DEFAULT: "#E17055", 500: "#E17055" },
        sidebar: { DEFAULT: "#1E1E2E", hover: "#2A2A3E" },
      },
    },
  },
  plugins: [],
};
