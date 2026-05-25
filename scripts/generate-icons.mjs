import { writeFileSync, mkdirSync, existsSync, copyFileSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const assetsDir = join(root, "assets");
const sourcePng = join(assetsDir, "icon-source.png");
const sourceSvg = join(assetsDir, "favicon.svg");

/** Generated in Cursor workspace during design — copied on first `npm run icons`. */
const cursorSource = join(
  process.env.USERPROFILE || "",
  ".cursor",
  "projects",
  "e-Humza-Programming-Personal-Blitz",
  "assets",
  "blitz-icon-source.png"
);

mkdirSync(assetsDir, { recursive: true });

if (!existsSync(sourcePng) && existsSync(cursorSource)) {
  copyFileSync(cursorSource, sourcePng);
  console.log("Copied icon-source.png from Cursor assets");
}

async function withSharp() {
  const sharp = (await import("sharp")).default;
  const input = existsSync(sourcePng)
    ? sourcePng
    : existsSync(sourceSvg)
      ? readFileSync(sourceSvg)
      : null;

  if (!input) {
    throw new Error("Missing assets/icon-source.png and assets/favicon.svg");
  }

  for (const size of [16, 48, 128]) {
    await sharp(input, { density: 300 })
      .resize(size, size, { fit: "cover" })
      .png()
      .toFile(join(assetsDir, `icon${size}.png`));
  }

  await sharp(input, { density: 300 })
    .resize(32, 32)
    .png()
    .toFile(join(assetsDir, "favicon-32.png"));

  for (const dir of [join(root, "popup", "public"), join(root, "web", "public")]) {
    mkdirSync(dir, { recursive: true });
    copyFileSync(sourceSvg, join(dir, "favicon.svg"));
    copyFileSync(join(assetsDir, "favicon-32.png"), join(dir, "favicon-32.png"));
  }

  console.log("Icons written to assets/ + popup/public + web/public");
}

async function fallbackSvgOnly() {
  if (!existsSync(sourceSvg)) throw new Error("Install sharp (npm i -D sharp) or add assets/favicon.svg");
  for (const dir of [
    join(root, "popup", "public"),
    join(root, "web", "public"),
  ]) {
    mkdirSync(dir, { recursive: true });
    copyFileSync(sourceSvg, join(dir, "favicon.svg"));
  }
  console.warn(
    "sharp not installed — extension PNGs unchanged. Run: npm i -D sharp && npm run icons"
  );
  console.log("favicon.svg copied to popup/public and web/public");
}

try {
  await withSharp();
} catch (err) {
  if (err.code === "ERR_MODULE_NOT_FOUND" || /Cannot find module 'sharp'/.test(String(err.message))) {
    await fallbackSvgOnly();
  } else {
    throw err;
  }
}
