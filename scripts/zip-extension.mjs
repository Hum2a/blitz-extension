import { execSync } from "child_process";
import { existsSync, mkdirSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { platform } from "os";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const version = pkg.version;
const outDir = join(root, "dist");
const zipName = `blitz-extension-v${version}.zip`;
const zipPath = join(outDir, zipName);

if (!existsSync(join(root, "popup", "dist", "index.html"))) {
  console.error("popup/dist not found. Run: npm run build");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

const exclude = [
  "node_modules",
  "popup\\src",
  "popup/src",
  ".git",
  "dist\\*.zip",
  "dist/*.zip",
  "license-worker\\node_modules",
  "license-worker/node_modules",
  ".license-value.json",
];

if (platform() === "win32") {
  const excludeArgs = exclude.map((e) => `-Exclude "${e}"`).join(", ");
  const ps = `
    $src = '${root.replace(/'/g, "''")}'
    $dest = '${zipPath.replace(/'/g, "''")}'
    if (Test-Path $dest) { Remove-Item $dest -Force }
    $staging = Join-Path (Split-Path $dest) 'pack-staging'
    if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
    New-Item -ItemType Directory -Path $staging | Out-Null
    robocopy $src $staging /E /XD node_modules popup\\src .git license-worker\\node_modules /XF *.zip .license-value.json | Out-Null
    if ($LASTEXITCODE -ge 8) { exit 1 }
    Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $dest -Force
    Remove-Item $staging -Recurse -Force
  `;
  execSync(`powershell -NoProfile -Command "${ps.replace(/\n/g, " ")}"`, { stdio: "inherit" });
} else {
  execSync(
    `cd "${root}" && zip -r "${zipPath}" . -x "node_modules/*" "popup/src/*" ".git/*" "dist/*.zip" "license-worker/node_modules/*"`,
    { stdio: "inherit", shell: true }
  );
}

console.log(`\nPackaged: dist/${zipName}`);
console.log("Upload this zip to the Chrome Web Store developer dashboard.");
