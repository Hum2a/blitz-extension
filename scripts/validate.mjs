import { existsSync, readFileSync } from "fs";
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

const configPath = join(root, "popup/src/lib/config.js");
const secretsPath = join(root, "popup/src/lib/config.secrets.js");
if (existsSync(configPath)) {
  const configSrc = readFileSync(configPath, "utf8");
  const hasEmbeddedSecret =
    /service_role|SERVICE_ROLE/i.test(configSrc) ||
    /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\./.test(configSrc) ||
    /https:\/\/[a-z0-9]+\.supabase\.co/i.test(configSrc);
  if (hasEmbeddedSecret) {
    console.log(
      "  ✗ config.js — must not embed Supabase URL/keys; use .env + npm run config:sync"
    );
    failed = true;
  } else {
    console.log("  ✓ config.js — no embedded Supabase secrets");
  }
}
if (existsSync(secretsPath)) {
  const gitignorePath = join(root, ".gitignore");
  const gitignore = existsSync(gitignorePath) ? readFileSync(gitignorePath, "utf8") : "";
  if (!gitignore.includes("config.secrets.js")) {
    console.log("  ✗ config.secrets.js exists but is not listed in .gitignore");
    failed = true;
  } else {
    console.log("  ✓ config.secrets.js is gitignored");
  }
}

if (failed) {
  console.log("\nValidation failed. Try: npm run build && npm run icons");
  process.exit(1);
}

console.log("\nValidation passed.");
