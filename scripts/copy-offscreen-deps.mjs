import { copyFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const nm = join(root, "node_modules");

const copies = [
  ["jspdf/dist/jspdf.umd.min.js", "offscreen/jspdf.umd.min.js"],
  ["html2canvas/dist/html2canvas.min.js", "offscreen/html2canvas.min.js"],
];

let ok = true;
for (const [rel, destRel] of copies) {
  const src = join(nm, rel);
  const dest = join(root, destRel);
  if (!existsSync(src)) {
    console.warn(`Skip (not installed): ${rel}`);
    ok = false;
    continue;
  }
  copyFileSync(src, dest);
  console.log(`Copied ${rel} → ${destRel}`);
}

if (!ok) {
  console.warn("Run: npm install html2canvas jspdf");
}
