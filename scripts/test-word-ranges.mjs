import { readFileSync } from "fs";

const template = readFileSync(
  "e:/Humza/Job Searching/CV's/Past CVs/Humza Butt CV - My Finance Club.htm",
  "latin1"
);

const markers = [
  { key: "summary", re: /Professional\s+Summary/i },
  { key: "education", re: /Education\s*<o:p>/i },
  { key: "skills", re: /Technical\s+Skills/i },
  { key: "career", re: /Career\s*\(/i },
];

function findMarkerIndex(html, re) {
  const m = html.match(re);
  return m ? m.index : -1;
}

function contentStartAfterHeading(html, headingIndex) {
  const slice = html.slice(headingIndex);
  const borderClose = slice.indexOf("</div>");
  if (borderClose >= 0 && borderClose < 800) {
    return headingIndex + borderClose + "</div>".length;
  }
  const pClose = slice.indexOf("</p>");
  return pClose >= 0 ? headingIndex + pClose + "</p>".length : headingIndex;
}

const hits = markers
  .map(({ key, re }) => ({ key, index: findMarkerIndex(template, re) }))
  .filter((h) => h.index >= 0)
  .sort((a, b) => a.index - b.index);

for (let i = 0; i < hits.length; i++) {
  const start = contentStartAfterHeading(template, hits[i].index);
  const end = i + 1 < hits.length ? hits[i + 1].index : template.length;
  const slice = template.slice(start, Math.min(start + 120, end));
  console.log(hits[i].key, "heading@", hits[i].index, "content", start, "-", end, "len", end - start);
  console.log("  preview:", slice.replace(/\s+/g, " ").slice(0, 100));
}
