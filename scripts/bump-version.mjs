import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bump = process.argv[2] || "patch";

function parseVersion(v) {
  const m = v.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  if (!m) throw new Error(`Invalid semver: ${v}`);
  return { major: +m[1], minor: +m[2], patch: +m[3], prerelease: m[4] || "" };
}

function bumpVersion(current, type) {
  const v = parseVersion(current);
  switch (type) {
    case "major":
      return `${v.major + 1}.0.0`;
    case "minor":
      return `${v.major}.${v.minor + 1}.0`;
    case "patch":
      return `${v.major}.${v.minor}.${v.patch + 1}`;
    default:
      if (/^\d+\.\d+\.\d+/.test(type)) return type.replace(/^v/, "");
      throw new Error(`Unknown bump type: ${type}. Use patch|minor|major|x.y.z`);
  }
}

const pkgPath = join(root, "package.json");
const manifestPath = join(root, "manifest.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const next = bumpVersion(pkg.version, bump);

pkg.version = next;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
manifest.version = next;
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Version bumped: ${next}`);
console.log("  - package.json");
console.log("  - manifest.json");
console.log("\nNext: npm run changelog:add -- \"Your release notes\"");
