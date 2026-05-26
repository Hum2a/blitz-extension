import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

/** Blitz admin dashboard — deploy separately (e.g. admin.blitz.com). */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(__dirname), "");
  return {
    plugins: [react()],
    root: "admin",
    base: "/",
    envDir: resolve(__dirname),
    envPrefix: ["VITE_", "SUPABASE_"],
    server: {
      port: Number(env.ADMIN_DEV_PORT) || 3790,
      strictPort: true,
    },
    build: {
      outDir: resolve(__dirname, "admin-dist"),
      emptyOutDir: true,
    },
  };
});
