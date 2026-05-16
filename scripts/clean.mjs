import { rmSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const targets = [
  join(root, "popup", "dist"),
  join(root, "dist"),
  join(root, ".cache"),
];

for (const path of targets) {
  if (existsSync(path)) {
    rmSync(path, { recursive: true, force: true });
    console.log(`Removed ${path.replace(root, ".")}`);
  }
}

console.log("Clean complete. Run npm run build to rebuild.");
