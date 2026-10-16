/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f2e0da',
          100: '#e6a393',
          200: '#d97b68',
          300: '#cc5441',
          400: '#bf2f1f',
          500: '#b30c00',
          600: '#8c0500',
          700: '#660000',
          800: '#400002',
          900: '#1a0002',
        }
      }
    },
  },
  plugins: [],
};