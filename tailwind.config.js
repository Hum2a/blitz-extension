/** @type {import('tailwindcss').Config} */
const withVar = (name) => `rgb(var(--${name}) / <alpha-value>)`;

const scale = (prefix) => ({
  50: withVar(`${prefix}-50`),
  100: withVar(`${prefix}-100`),
  200: withVar(`${prefix}-200`),
  300: withVar(`${prefix}-300`),
  400: withVar(`${prefix}-400`),
  500: withVar(`${prefix}-500`),
  600: withVar(`${prefix}-600`),
  700: withVar(`${prefix}-700`),
  800: withVar(`${prefix}-800`),
  900: withVar(`${prefix}-900`),
  950: withVar(`${prefix}-950`),
});

export default {
  content: [
    "./popup/**/*.{html,jsx,js}",
    "./web/**/*.{html,jsx,js}",
    "./marketing/**/*.{html,jsx,js}",
  ],
  theme: {
    extend: {
      colors: {
        blitz: scale("blitz"),
        slate: scale("slate"),
      },
      animation: {
        "gradient-shift": "gradient-shift 6s ease infinite",
        float: "float 4s ease-in-out infinite",
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
