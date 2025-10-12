import type { Config } from "tailwindcss";
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "rgb(139 92 246)",
          50: "rgb(245 243 255)", 100: "rgb(237 233 254)", 200: "rgb(221 214 254)",
          300: "rgb(196 181 253)", 400: "rgb(167 139 250)", 500: "rgb(139 92 246)",
          600: "rgb(124 58 237)", 700: "rgb(109 40 217)", 800: "rgb(91 33 182)", 900: "rgb(76 29 149)"
        }
      }
    }
  },
  plugins: [],
} satisfies Config; 