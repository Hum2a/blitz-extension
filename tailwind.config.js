/** @type {import('tailwindcss').Config} */
export default {
  content: ["./popup/**/*.{html,jsx,js}"],
  theme: {
    extend: {
      colors: {
        blitz: {
          50: "#f0f4ff",
          100: "#e0e9ff",
          500: "#4f6ef7",
          600: "#3b5bdb",
          700: "#2f4ac4",
          900: "#1a2a6c",
        },
      },
    },
  },
  plugins: [],
};
