/** @type {import('tailwindcss').Config} */
export default {
  content: ["./popup/**/*.{html,jsx,js}", "./web/**/*.{html,jsx,js}"],
  theme: {
    extend: {
      colors: {
        blitz: {
          50: "#f0f4ff",
          100: "#e0e9ff",
          500: "#4f6ef7",
          600: "#3b5bdb",
          700: "#2f4ac4",
          800: "#243d9e",
          900: "#1a2a6c",
        },
      },
      animation: {
        "gradient-shift": "gradient-shift 6s ease infinite",
        "float": "float 4s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2.5s ease-in-out infinite",
      },
      keyframes: {
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.85" },
        },
      },
    },
  },
  plugins: [],
};
