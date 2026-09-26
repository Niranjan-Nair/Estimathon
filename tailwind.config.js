/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        base: {
          DEFAULT: "#0a0a0a",
          soft: "#141414",
          raised: "#1c1c1c",
          border: "#2a2a2a",
        },
        accent: {
          DEFAULT: "#c8102e",
          hover: "#e01b3d",
          muted: "#7a0e21",
        },
      },
      fontFamily: {
        heading: ["Quantico", "sans-serif"],
        body: ["Lexend", "sans-serif"],
      },
    },
  },
  plugins: [],
};
