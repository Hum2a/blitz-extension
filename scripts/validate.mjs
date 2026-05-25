import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const required = [
  "manifest.json",
  "background/service-worker.js",
  "background/tab-jobs.js",
  "offscreen/offscreen.html",
  "offscreen/pdf-generator.js",
  "offscreen/jspdf.umd.min.js",
  "assets/favicon.svg",
  "assets/icon16.png",
  "assets/icon48.png",
  "assets/icon128.png",
  "popup/dist/index.html",
  "popup/dist/dashboard.html",
  "content/page-context.js",
  "content/job-widget.js",
  "content/job-widget.css",
];

const optional = ["popup/dist/assets"];

let failed = false;

console.log("Validating Blitz extension…\n");

for (const file of required) {
  const path = join(root, file);
  if (existsSync(path)) {
    console.log(`  ✓ ${file}`);
  } else {
    console.log(`  ✗ ${file} — MISSING`);
    failed = true;
  }
}

if (failed) {
  console.log("\nValidation failed. Try: npm run build && npm run icons");
  process.exit(1);
}

console.log("\nValidation passed.");
