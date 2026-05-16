/**
 * Usage: node scripts/test-license-api.mjs [worker-url] [license-key]
 * Default URL: your deployed workers.dev URL or pass as first arg.
 */
const url =
  process.argv[2] ||
  "https://blitz-license.humzab1711.workers.dev";
const key = process.argv[3] || "TEST-KEY-123";

console.log("GET", url);
const health = await fetch(url);
console.log(await health.text());

console.log("\nPOST", url, { key });
const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ key }),
});
console.log(res.status, await res.text());
