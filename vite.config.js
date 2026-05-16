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
      input: resolve(__dirname, "popup/index.html"),
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "popup/src"),
    },
  },
});
