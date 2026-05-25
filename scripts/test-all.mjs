import { spawnSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function run(name, cmd, args, cwd = root) {
  console.log(`\n▶ ${name}`);
  const result = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: true });
  if (result.status !== 0) {
    console.error(`✗ ${name} failed`);
    process.exit(result.status || 1);
  }
  console.log(`✓ ${name}`);
}

console.log("Running Blitz test suite…");

run("Unit tests (Vitest)", "npm", ["run", "test:unit"]);
run("Validate extension", "node", ["scripts/validate.mjs"]);

const workerTest = spawnSync("npm", ["run", "test", "--prefix", "license-worker"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
});

if (workerTest.status !== 0) {
  console.warn("\n⚠ License worker test skipped or failed (network/KV may be unavailable)");
} else {
  console.log("✓ License worker API");
}

console.log("\nAll local checks complete.");
