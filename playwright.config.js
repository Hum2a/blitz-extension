import { defineConfig } from "@playwright/test";

const MARKETING_PORT = 3789;

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: `http://127.0.0.1:${MARKETING_PORT}`,
    headless: true,
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run marketing:e2e",
    url: `http://127.0.0.1:${MARKETING_PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
