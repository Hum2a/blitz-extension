import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    name: "blitz-extension",
    root: ".",
    environment: "happy-dom",
    globals: false,
    setupFiles: ["tests/setup/vitest.setup.js"],
    include: ["tests/**/*.test.{js,jsx}"],
    exclude: ["node_modules", "popup/dist", "license-worker"],
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
      include: ["popup/src/lib/**/*.js", "content/**/*.js", "background/**/*.js"],
      exclude: [
        "**/*.test.js",
        "popup/src/lib/config.js",
        "popup/src/lib/supabase-client.js",
      ],
      thresholds: {
        lines: 0,
        functions: 0,
        branches: 0,
        statements: 0,
      },
    },
    testTimeout: 10_000,
    hookTimeout: 10_000,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "popup/src"),
    },
  },
});
