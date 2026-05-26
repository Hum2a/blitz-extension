import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

/** Local web UI — same React app, talks to extension via externally_connectable. */
export default defineConfig({
  plugins: [react()],
  root: "web",
  base: "/",
  server: {
    port: 3789,
    strictPort: true,
  },
  build: {
    outDir: resolve(__dirname, "web-dist"),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "popup/src"),
    },
  },
});
