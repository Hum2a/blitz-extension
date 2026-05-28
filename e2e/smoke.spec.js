import { test, expect } from "@playwright/test";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test.describe("Blitz smoke", () => {
  test("production build artifacts exist", () => {
    const required = [
      "manifest.json",
      "background/service-worker.js",
      "popup/dist/index.html",
      "popup/dist/dashboard.html",
      "content/bamboohr.js",
    ];
    for (const file of required) {
      expect(existsSync(join(root, file)), `${file} missing — run npm run build`).toBeTruthy();
    }
  });

  test("marketing install section renders when store URL unset", async ({ page, baseURL }) => {
    await page.goto(baseURL || "/");
    await expect(page.locator("#install")).toBeVisible();
    await expect(page.getByRole("heading", { name: /chrome web store/i })).toBeVisible();
  });
});
