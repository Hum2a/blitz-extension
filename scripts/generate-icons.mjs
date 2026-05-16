import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(__dirname, "..", "assets");
mkdirSync(assetsDir, { recursive: true });

// 16x16 solid #3b5bdb PNG
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAI0lEQVQ4y2P4z8Dwn4GKgZGBgYGBgYGBgYGBgYGBgQEAAAD//wMAFPEB1Q3s5QAAAABJRU5ErkJggg==",
  "base64"
);

for (const size of [16, 48, 128]) {
  writeFileSync(join(assetsDir, `icon${size}.png`), PNG);
}

console.log("Icons written to assets/");
