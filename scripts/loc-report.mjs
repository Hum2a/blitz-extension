/**
 * Lines-of-code report for the Blitz repository.
 *
 * Usage:
 *   node scripts/loc-report.mjs           # console + writes reports/
 *   node scripts/loc-report.mjs --json    # JSON only to stdout
 *   node scripts/loc-report.mjs --md      # markdown only to stdout
 *   node scripts/loc-report.mjs --no-write  # console only, no files
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "fs";
import { dirname, extname, join, relative, sep } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPORTS_DIR = join(ROOT, "reports");

const ARGS = new Set(process.argv.slice(2));
const JSON_ONLY = ARGS.has("--json");
const MD_ONLY = ARGS.has("--md");
const NO_WRITE = ARGS.has("--no-write");
const VERBOSE = ARGS.has("--verbose");

/** Directory names always skipped (any depth). */
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  ".wrangler",
  "coverage",
  ".turbo",
  ".next",
  "__pycache__",
]);

/** Path segments that skip a subtree when matched as a folder name. */
const SKIP_PATH_SEGMENTS = new Set(["popup/dist"]);

/** Vendored / generated binaries — excluded from source LOC. */
const SKIP_FILE_NAMES = new Set([
  "jspdf.umd.min.js",
  "html2canvas.min.js",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
]);

const SKIP_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".svg",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".zip",
  ".pdf",
  ".map",
  ".mjs.map",
]);

/** Extension → language label for breakdown. */
const LANG_BY_EXT = {
  ".js": "JavaScript",
  ".jsx": "React (JSX)",
  ".ts": "TypeScript",
  ".tsx": "TypeScript (TSX)",
  ".mjs": "JavaScript (ESM)",
  ".cjs": "JavaScript (CJS)",
  ".css": "CSS",
  ".html": "HTML",
  ".json": "JSON",
  ".md": "Markdown",
  ".mdc": "Cursor rules",
  ".sql": "SQL",
  ".toml": "TOML",
  ".yml": "YAML",
  ".yaml": "YAML",
  ".sh": "Shell",
  ".ps1": "PowerShell",
};

/** Top-level folder → human area name (first matching segment wins). */
const AREA_BY_SEGMENT = [
  ["popup/src/components", "Popup UI (components)"],
  ["popup/src/hooks", "Popup UI (hooks)"],
  ["popup/src/styles", "Popup UI (styles)"],
  ["popup/src/lib", "Shared lib (popup/src/lib)"],
  ["popup/src", "Popup UI (entry & misc)"],
  ["popup", "Popup (HTML / Vite)"],
  ["background", "Background (service worker)"],
  ["content", "Content scripts"],
  ["offscreen", "Offscreen (PDF)"],
  ["license-worker", "License worker (Cloudflare)"],
  ["supabase/functions", "Supabase (edge functions)"],
  ["supabase/migrations", "Supabase (migrations)"],
  ["supabase", "Supabase (config)"],
  ["scripts", "Build & tooling scripts"],
  ["web", "Local web bridge"],
  ["docs", "Documentation"],
  ["chrome-store", "Chrome Web Store"],
  [".github", "GitHub (CI & templates)"],
  [".cursor", "Cursor rules"],
  ["assets", "Assets (icons)"],
];

function shouldSkipDir(relPath, name) {
  if (SKIP_DIRS.has(name)) return true;
  const norm = relPath.replace(/\\/g, "/");
  for (const seg of SKIP_PATH_SEGMENTS) {
    if (norm === seg || norm.startsWith(`${seg}/`)) return true;
  }
  return false;
}

function shouldSkipFile(relPath, name) {
  if (SKIP_FILE_NAMES.has(name)) return true;
  const ext = extname(name).toLowerCase();
  if (SKIP_EXTENSIONS.has(ext)) return true;
  if (name.endsWith(".min.js") || name.includes(".worker.min.")) return true;
  if (relPath.replace(/\\/g, "/").includes("/node_modules/")) return true;
  return false;
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    const rel = relative(ROOT, full);
    if (entry.isDirectory()) {
      if (shouldSkipDir(rel, entry.name)) continue;
      walk(full, files);
      continue;
    }
    if (!entry.isFile()) continue;
    if (shouldSkipFile(rel, entry.name)) continue;
    const st = statSync(full);
    files.push({ path: full, rel: rel.replace(/\\/g, "/"), size: st.size });
  }
  return files;
}

function detectArea(rel) {
  const norm = rel.replace(/\\/g, "/");
  for (const [prefix, label] of AREA_BY_SEGMENT) {
    if (norm === prefix || norm.startsWith(`${prefix}/`)) return label;
  }
  if (!norm.includes("/")) return "Repository root";
  const top = norm.split("/")[0];
  return `Other (${top})`;
}

function detectLanguage(rel) {
  const ext = extname(rel).toLowerCase();
  if (LANG_BY_EXT[ext]) return LANG_BY_EXT[ext];
  if (ext) return ext.slice(1).toUpperCase();
  return "Other";
}

function isCommentLine(line, state, langKey) {
  const trimmed = line.trim();
  if (!trimmed) return { comment: false, state };

  if (state.blockComment) {
    if (trimmed.includes("*/")) return { comment: true, state: { ...state, blockComment: false } };
    return { comment: true, state };
  }

  if (langKey === "html" || langKey === "md") {
    if (trimmed.startsWith("<!--")) {
      const closed = trimmed.includes("-->");
      return { comment: true, state: { ...state, htmlComment: !closed } };
    }
    if (state.htmlComment) {
      const closed = trimmed.includes("-->");
      return { comment: true, state: { ...state, htmlComment: !closed } };
    }
  }

  if (langKey === "jsx" || langKey === "tsx") {
    if (trimmed.startsWith("{/*")) {
      const closed = trimmed.includes("*/}");
      return { comment: true, state: { ...state, jsxComment: !closed } };
    }
    if (state.jsxComment) {
      const closed = trimmed.includes("*/}");
      return { comment: true, state: { ...state, jsxComment: !closed } };
    }
  }

  if (langKey === "sql" && trimmed.startsWith("--")) {
    return { comment: true, state };
  }
  if ((langKey === "css" || langKey === "mdc") && trimmed.startsWith("/*")) {
    if (trimmed.includes("*/") && trimmed.indexOf("*/") > trimmed.indexOf("/*")) {
      return { comment: true, state };
    }
    return { comment: true, state: { ...state, blockComment: !trimmed.includes("*/") } };
  }

  if (
    ["js", "mjs", "cjs", "ts", "tsx", "jsx", "json"].includes(langKey) &&
    trimmed.startsWith("//")
  ) {
    return { comment: true, state };
  }

  if (trimmed.startsWith("/*")) {
    if (trimmed.includes("*/") && trimmed.indexOf("*/") > trimmed.indexOf("/*")) {
      return { comment: true, state };
    }
    return { comment: true, state: { ...state, blockComment: true } };
  }

  return { comment: false, state };
}

function langKeyFromPath(rel) {
  const ext = extname(rel).toLowerCase();
  if (ext === ".jsx") return "jsx";
  if (ext === ".tsx") return "tsx";
  if (ext === ".ts") return "ts";
  if (ext === ".mjs" || ext === ".cjs" || ext === ".js") return "js";
  if (ext === ".css" || ext === ".mdc") return "css";
  if (ext === ".html") return "html";
  if (ext === ".sql") return "sql";
  if (ext === ".md") return "md";
  return "other";
}

function analyzeFile(file) {
  let content;
  try {
    content = readFileSync(file.path, "utf8");
  } catch {
    return null;
  }
  if (content.includes("\0")) return null;

  const lines = content.split(/\r?\n/);
  const langKey = langKeyFromPath(file.rel);
  let blank = 0;
  let comment = 0;
  let state = { blockComment: false, htmlComment: false, jsxComment: false };

  for (const line of lines) {
    if (!line.trim()) {
      blank++;
      continue;
    }
    const result = isCommentLine(line, state, langKey);
    state = result.state;
    if (result.comment) comment++;
  }

  const total = lines.length;
  const code = Math.max(0, total - blank - comment);

  return {
    rel: file.rel,
    area: detectArea(file.rel),
    language: detectLanguage(file.rel),
    bytes: file.size,
    total,
    blank,
    comment,
    code,
  };
}

function emptyBucket() {
  return { files: 0, total: 0, blank: 0, comment: 0, code: 0, bytes: 0 };
}

function addToBucket(bucket, row) {
  bucket.files++;
  bucket.total += row.total;
  bucket.blank += row.blank;
  bucket.comment += row.comment;
  bucket.code += row.code;
  bucket.bytes += row.bytes;
}

function pad(str, n, align = "left") {
  const s = String(str);
  if (s.length >= n) return s.slice(0, n);
  return align === "right" ? s.padStart(n) : s.padEnd(n);
}

function pct(part, whole) {
  if (!whole) return "0.0%";
  return `${((part / whole) * 100).toFixed(1)}%`;
}

function bar(ratio, width = 24) {
  const filled = Math.round(Math.min(1, Math.max(0, ratio)) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function buildReport(rows) {
  const generatedAt = new Date().toISOString();
  const totals = emptyBucket();
  for (const row of rows) addToBucket(totals, row);

  const byArea = new Map();
  const byLang = new Map();
  const byExt = new Map();

  for (const row of rows) {
    if (!byArea.has(row.area)) byArea.set(row.area, emptyBucket());
    if (!byLang.has(row.language)) byLang.set(row.language, emptyBucket());
    const ext = extname(row.rel).toLowerCase() || "(none)";
    if (!byExt.has(ext)) byExt.set(ext, emptyBucket());
    addToBucket(byArea.get(row.area), row);
    addToBucket(byLang.get(row.language), row);
    addToBucket(byExt.get(ext), row);
  }

  const sortedAreas = [...byArea.entries()].sort((a, b) => b[1].code - a[1].code);
  const sortedLangs = [...byLang.entries()].sort((a, b) => b[1].code - a[1].code);
  const sortedExts = [...byExt.entries()].sort((a, b) => b[1].code - a[1].code);
  const largestFiles = [...rows].sort((a, b) => b.code - a.code).slice(0, 15);

  const sourceRows = rows.filter((r) => {
    const doc = ["Markdown", "Cursor rules", "JSON", "YAML", "TOML"];
    return !doc.includes(r.language) || r.rel.endsWith(".mdc");
  });
  const sourceCode = sourceRows.reduce((n, r) => n + r.code, 0);

  return {
    meta: {
      generatedAt,
      root: ROOT,
      fileCount: rows.length,
      excludedNotes:
        "Excludes node_modules, dist, popup/dist, vendored *.min.js, lockfiles, images, and binaries.",
    },
    summary: {
      ...totals,
      sourceCodeLines: sourceCode,
      sourceFileCount: sourceRows.length,
    },
    byArea: Object.fromEntries(sortedAreas),
    byLanguage: Object.fromEntries(sortedLangs),
    byExtension: Object.fromEntries(sortedExts),
    largestFiles: largestFiles.map((r) => ({
      path: r.rel,
      code: r.code,
      total: r.total,
      area: r.area,
    })),
    files: VERBOSE ? rows.sort((a, b) => a.rel.localeCompare(b.rel)) : undefined,
  };
}

function printTable(title, entries, codeTotal) {
  console.log(`\n${title}`);
  console.log("─".repeat(72));
  console.log(
    `${pad("Category", 36)} ${pad("Files", 6, "right")} ${pad("Code", 8, "right")} ${pad("%", 7, "right")}  Bar`
  );
  console.log("─".repeat(72));
  for (const [name, b] of entries) {
    const ratio = codeTotal ? b.code / codeTotal : 0;
    console.log(
      `${pad(name, 36)} ${pad(b.files, 6, "right")} ${pad(b.code.toLocaleString(), 8, "right")} ${pad(pct(b.code, codeTotal), 7, "right")}  ${bar(ratio)}`
    );
  }
}

function printConsole(report) {
  const { summary, meta } = report;
  const areas = Object.entries(report.byArea);
  const langs = Object.entries(report.byLanguage);

  console.log("\n╔══════════════════════════════════════════════════════════════════════╗");
  console.log("║                    BLITZ — LINES OF CODE REPORT                      ║");
  console.log("╚══════════════════════════════════════════════════════════════════════╝");
  console.log(`\nGenerated: ${meta.generatedAt}`);
  console.log(`Root:      ${meta.root}`);
  console.log(`Note:      ${meta.excludedNotes}`);

  console.log("\n┌─ SUMMARY ─────────────────────────────────────────────────────────────┐");
  console.log(`│  Files scanned:     ${pad(summary.files.toLocaleString(), 10, "right")}                                  │`);
  console.log(`│  Total lines:      ${pad(summary.total.toLocaleString(), 10, "right")}                                  │`);
  console.log(`│  Code lines:       ${pad(summary.code.toLocaleString(), 10, "right")}   (${pct(summary.code, summary.total)} of total)   │`);
  console.log(`│  Comment lines:    ${pad(summary.comment.toLocaleString(), 10, "right")}   (${pct(summary.comment, summary.total)} of total)   │`);
  console.log(`│  Blank lines:      ${pad(summary.blank.toLocaleString(), 10, "right")}   (${pct(summary.blank, summary.total)} of total)   │`);
  console.log(`│  Source code*:     ${pad(summary.sourceCodeLines.toLocaleString(), 10, "right")}   (${summary.sourceFileCount} non-doc/config files)│`);
  console.log(`│  Bytes (text):     ${pad(summary.bytes.toLocaleString(), 10, "right")}                                  │`);
  console.log("└──────────────────────────────────────────────────────────────────────┘");
  console.log("  * Excludes markdown, JSON, YAML, TOML from “source code” subtotal.");

  printTable("BY PROJECT AREA (code lines)", areas, summary.code);
  printTable("BY LANGUAGE (code lines)", langs, summary.code);

  console.log("\n┌─ LARGEST FILES (by code lines) ───────────────────────────────────────┐");
  for (const f of report.largestFiles) {
    console.log(`│  ${pad(`${f.code.toLocaleString()} LOC`, 10, "right")}  ${pad(f.path, 54)} │`);
  }
  console.log("└──────────────────────────────────────────────────────────────────────┘");

  if (!NO_WRITE) {
    console.log(`\nReports written:`);
    console.log(`  • ${join(REPORTS_DIR, "loc-report.md")}`);
    console.log(`  • ${join(REPORTS_DIR, "loc-report.json")}`);
  }
  console.log("");
}

function buildMarkdown(report) {
  const { summary, meta, byArea, byLanguage, byExtension, largestFiles } = report;
  const lines = [];

  lines.push("# Blitz — Lines of Code Report");
  lines.push("");
  lines.push(`**Generated:** ${meta.generatedAt}`);
  lines.push(`**Repository root:** \`${meta.root}\``);
  lines.push("");
  lines.push(`> ${meta.excludedNotes}`);
  lines.push("");

  lines.push("## Executive summary");
  lines.push("");
  lines.push("| Metric | Count |");
  lines.push("|--------|------:|");
  lines.push(`| Files scanned | ${summary.files.toLocaleString()} |`);
  lines.push(`| Total lines | ${summary.total.toLocaleString()} |`);
  lines.push(`| **Code lines** | **${summary.code.toLocaleString()}** |`);
  lines.push(`| Comment lines | ${summary.comment.toLocaleString()} |`);
  lines.push(`| Blank lines | ${summary.blank.toLocaleString()} |`);
  lines.push(`| Source code (excl. docs/config) | ${summary.sourceCodeLines.toLocaleString()} |`);
  lines.push(`| Text bytes | ${summary.bytes.toLocaleString()} |`);
  lines.push("");
  lines.push(
    `Code is **${pct(summary.code, summary.total)}** of all lines; comments **${pct(summary.comment, summary.total)}**, blanks **${pct(summary.blank, summary.total)}**.`
  );
  lines.push("");

  function tableSection(title, entries, mapFn) {
    lines.push(`## ${title}`);
    lines.push("");
    lines.push("| Category | Files | Total | Code | Comments | Blanks | % of code |");
    lines.push("|----------|------:|------:|-----:|---------:|-------:|----------:|");
    const sorted = Object.entries(entries).sort((a, b) => b[1].code - a[1].code);
    for (const [name, b] of sorted) {
      lines.push(
        `| ${mapFn ? mapFn(name) : name} | ${b.files} | ${b.total.toLocaleString()} | ${b.code.toLocaleString()} | ${b.comment.toLocaleString()} | ${b.blank.toLocaleString()} | ${pct(b.code, summary.code)} |`
      );
    }
    lines.push("");
  }

  tableSection("Breakdown by project area", byArea, (n) => n);
  tableSection("Breakdown by language", byLanguage, (n) => n);
  tableSection("Breakdown by file extension", byExtension, (n) => `\`${n}\``);

  lines.push("## Largest files (code lines)");
  lines.push("");
  lines.push("| LOC | File | Area |");
  lines.push("|----:|------|------|");
  for (const f of largestFiles) {
    lines.push(`| ${f.code.toLocaleString()} | \`${f.path}\` | ${f.area} |`);
  }
  lines.push("");

  lines.push("## Methodology");
  lines.push("");
  lines.push("- **Code lines** = total lines − blank lines − comment lines.");
  lines.push("- Comments: `//`, `/* */`, `#` (SQL), `--` (SQL), `<!-- -->` (HTML), `{/* */}` (JSX).");
  lines.push("- Block comments spanning multiple lines are counted per line.");
  lines.push("- Vendored minified bundles and build output are excluded.");
  lines.push("");
  lines.push("---");
  lines.push("*Produced by `npm run loc` (`scripts/loc-report.mjs`).*");

  return lines.join("\n");
}

function main() {
  const files = walk(ROOT);
  const rows = files.map(analyzeFile).filter(Boolean);
  const report = buildReport(rows);

  if (JSON_ONLY) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  if (MD_ONLY) {
    console.log(buildMarkdown(report));
    return;
  }

  printConsole(report);

  if (!NO_WRITE) {
    if (!existsSync(REPORTS_DIR)) mkdirSync(REPORTS_DIR, { recursive: true });
    writeFileSync(join(REPORTS_DIR, "loc-report.json"), JSON.stringify(report, null, 2), "utf8");
    writeFileSync(join(REPORTS_DIR, "loc-report.md"), buildMarkdown(report), "utf8");
  }
}

main();
