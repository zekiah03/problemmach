import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1a1a1a",
        paper: "#fafaf7",
        muted: "#6b6b6b",
        accent: "#4a6fa5",
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Hiragino Sans", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
