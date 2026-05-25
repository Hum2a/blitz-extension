import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  root: "popup",
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "popup/index.html"),
        dashboard: resolve(__dirname, "popup/dashboard.html"),
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "popup/src"),
    },
  },
});
