/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      screens: {
        /**
         * Hero 兩欄版面（左按鈕、右神明）專用。
         *
         * 原本用 `sm:`（≥640px）切換，但神明那一欄的寬度是由 `min(98vh, 107.8vw)`
         * 推出來的——直立的視窗高度大，算出來比視窗還寬，而神明欄是 shrink-0、
         * 按鈕欄是 flex-1，於是按鈕被擠成負寬度推出畫面左緣。
         * 實測（2026-09-10，量「報名普渡法會」的 getBoundingClientRect）：
         *   768×1024 被裁 151px、820×1180 被裁 144px、1024×1366 被裁 119px
         *   ——按鈕全寬只有 223px，等於所有 iPad 直立都按不到。
         *   1180×820、1280×800、1440×900 正常。
         * 壞掉的全是直立、正常的全是橫向，所以判準是長寬比而不是寬度。
         * 640px 的下限保留：橫向但很窄的視窗（例如 700×500）仍然用上下排。
         */
        land: { raw: '(min-width: 640px) and (min-aspect-ratio: 1/1)' },
      },
      colors: {
        'temple-red': '#7C5C1E',
        'temple-gold': '#C49820',
        'temple-bg': '#F5F0E8',
        'temple-dark': '#2E2A22',
      },
      fontFamily: {
        serif: ['"Noto Serif TC"', 'serif'],
        sans: ['"Noto Sans TC"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
