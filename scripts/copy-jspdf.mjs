import { copyFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "jspdf", "dist", "jspdf.umd.min.js");
const dest = join(root, "offscreen", "jspdf.umd.min.js");

if (!existsSync(src)) {
  console.error("jspdf not found. Run: npm install");
  process.exit(1);
}

copyFileSync(src, dest);
console.log("Copied jspdf to offscreen/jspdf.umd.min.js");
