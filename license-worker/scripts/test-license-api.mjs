/**
 * Usage: node scripts/test-license-api.mjs [worker-url] [license-key]
 *
 * Default key: BLITZ-TEST-PRO-001 (create with npm run license:add -- BLITZ-TEST-PRO-001)
 */
const DEFAULT_URL = "https://blitz-license.humzab1711.workers.dev";
const DEFAULT_KEY = "BLITZ-TEST-PRO-001";

const args = process.argv.slice(2);
let url = DEFAULT_URL;
let key = DEFAULT_KEY;

for (const arg of args) {
  if (arg.startsWith("http://") || arg.startsWith("https://")) {
    url = arg;
  } else {
    key = arg;
  }
}

let failed = false;

console.log("GET", url);
const health = await fetch(url);
const healthText = await health.text();
console.log(healthText);
if (!health.ok) {
  console.error("✗ Health check failed");
  failed = true;
}

console.log("\nPOST", url, { key });
const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ key }),
});
const body = await res.json().catch(() => ({}));
console.log(res.status, JSON.stringify(body, null, 2));

if (body.valid && body.tier === "pro") {
  console.log("\n✓ License validation passed");
} else {
  console.error("\n✗ License validation failed");
  console.error(
    `  Key "${key}" is not in KV or inactive. Add it with:\n` +
      `  npm run license:add -- ${key}`
  );
  failed = true;
}

process.exit(failed ? 1 : 0);
