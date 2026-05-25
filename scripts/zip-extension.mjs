import archiver from "archiver";
import { createWriteStream, existsSync, mkdirSync, readFileSync } from "fs";
import { readdir } from "fs/promises";
import { dirname, join, relative } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const version = pkg.version;
const outDir = join(root, "dist");
const zipName = `blitz-extension-v${version}.zip`;
const zipPath = join(outDir, zipName);

function shouldSkip(relPath) {
  const norm = relPath.replace(/\\/g, "/");
  if (!norm || norm.startsWith("dist/")) return true;
  if (norm.includes("node_modules")) return true;
  if (norm.startsWith(".git")) return true;
  if (norm.startsWith("popup/src/")) return true;
  if (norm.endsWith(".zip")) return true;
  if (norm === ".license-value.json") return true;
  return false;
}

async function addDirectory(archive, dirPath, basePath) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);
    const relPath = relative(basePath, fullPath);
    if (shouldSkip(relPath)) continue;

    if (entry.isDirectory()) {
      await addDirectory(archive, fullPath, basePath);
    } else if (entry.isFile()) {
      archive.file(fullPath, { name: relPath.replace(/\\/g, "/") });
    }
  }
}

async function packExtension() {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => resolve(archive.pointer()));
    archive.on("error", reject);
    output.on("error", reject);

    archive.pipe(output);

    addDirectory(archive, root, root)
      .then(() => archive.finalize())
      .catch(reject);
  });
}

if (!existsSync(join(root, "popup", "dist", "index.html"))) {
  console.error("popup/dist not found. Run: npm run build");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

console.log("Packaging extension…");
const bytes = await packExtension();
console.log(`\nPackaged: dist/${zipName} (${(bytes / 1024).toFixed(1)} KB)`);
console.log("Upload this zip to the Chrome Web Store developer dashboard.");
