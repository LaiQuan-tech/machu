/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.tsx",
    "./*.ts",
  ],
  theme: {
    extend: {
      colors: {
        'temple-red': '#8B0000',
        'temple-gold': '#D4AF37',
        'temple-bg': '#FFFBF0',
        'temple-dark': '#2C0E0E',
      },
      fontFamily: {
        serif: ['"Noto Serif TC"', 'serif'],
        sans: ['"Noto Sans TC"', 'sans-serif'],
      }
    }
  },
  plugins: [],
}
