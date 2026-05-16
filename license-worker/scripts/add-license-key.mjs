/**
 * Usage: node scripts/add-license-key.mjs YOUR-LICENSE-KEY
 * Writes a temp JSON file and runs wrangler kv key put (PowerShell-safe).
 */
import { writeFileSync, unlinkSync } from "fs";
import { execSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const key = process.argv[2];
if (!key) {
  console.error("Usage: node scripts/add-license-key.mjs YOUR-LICENSE-KEY");
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const tmp = join(__dirname, "..", ".license-value.json");
const value = {
  tier: "pro",
  active: true,
  email: "user@example.com",
  createdAt: new Date().toISOString().slice(0, 10),
};

writeFileSync(tmp, JSON.stringify(value));
try {
  execSync(
    `npx wrangler kv key put --binding=LICENSE_KEYS "${key}" --path="${tmp}" --remote`,
    { stdio: "inherit", cwd: join(__dirname, "..") }
  );
  console.log(`\nLicense key "${key}" added. Test in extension Settings → License.`);
} finally {
  try {
    unlinkSync(tmp);
  } catch {
    /* ignore */
  }
}
