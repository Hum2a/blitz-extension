import { readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const changelogPath = join(root, "CHANGELOG.md");
const cmd = process.argv[2];
const message = process.argv.slice(3).join(" ").trim();

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const version = pkg.version;
const date = new Date().toISOString().slice(0, 10);

const header = `# Changelog

All notable changes to the Blitz Chrome extension are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/).

`;

function ensureChangelog() {
  if (!existsSync(changelogPath)) {
    writeFileSync(changelogPath, header);
  }
}

if (cmd === "add") {
  if (!message) {
    console.error('Usage: npm run changelog:add -- "Description of changes"');
    process.exit(1);
  }
  ensureChangelog();
  let content = readFileSync(changelogPath, "utf8");
  if (!content.startsWith("# Changelog")) {
    content = header + content;
  }
  const entry = `## [${version}] - ${date}\n\n- ${message}\n\n`;
  const insertAt = content.indexOf("\n", content.indexOf("# Changelog")) + 1;
  const afterHeader = content.indexOf("\n## ");
  const bodyStart = afterHeader === -1 ? content.length : afterHeader;
  const before = content.slice(0, bodyStart);
  const after = content.slice(bodyStart);
  writeFileSync(changelogPath, `${before}${entry}${after}`);
  console.log(`Added changelog entry for v${version}`);
} else {
  ensureChangelog();
  console.log(readFileSync(changelogPath, "utf8"));
}
