import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

/** Public marketing site — blitzai.online */
export default defineConfig({
  plugins: [react()],
  root: "marketing",
  base: "/",
  build: {
    outDir: resolve(__dirname, "marketing-dist"),
    emptyOutDir: true,
  },
  server: {
    port: 3788,
    strictPort: true,
  },
});
