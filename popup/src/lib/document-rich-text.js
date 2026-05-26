import { escapeHtmlText, sanitizeRichHtml } from "./cv-html.js";

const SECTION_HEADERS = new Set([
  "professional summary",
  "summary",
  "education",
  "technical skills",
  "skills",
  "career",
  "experience",
  "work experience",
]);

export function isRichHtml(value) {
  return /<[a-z][\s/>]/i.test(String(value || ""));
}

function isSectionHeader(line) {
  const key = line
    .toLowerCase()
    .replace(/[^a-z ]/g, "")
    .trim();
  return SECTION_HEADERS.has(key);
}

/** Plain text (or existing HTML) → sanitized HTML for the rich editor. */
export function plainTextToDocumentHtml(text) {
  if (!text?.trim()) return "<p></p>";
  if (isRichHtml(text)) return sanitizeRichHtml(text);

  const lines = text.split(/\r?\n/);
  const parts = [];
  let listItems = [];

  const flushList = () => {
    if (!listItems.length) return;
    parts.push(
      `<ul>${listItems.map((li) => `<li>${escapeHtmlText(li)}</li>`).join("")}</ul>`
    );
    listItems = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      continue;
    }
    if (/^[•\-–—*]\s+/.test(trimmed)) {
      listItems.push(trimmed.replace(/^[•\-–—*]\s+/, ""));
      continue;
    }
    flushList();
    if (isSectionHeader(trimmed)) {
      parts.push(`<h2>${escapeHtmlText(trimmed)}</h2>`);
    } else {
      parts.push(`<p>${escapeHtmlText(trimmed)}</p>`);
    }
  }
  flushList();
  return parts.join("") || "<p></p>";
}

/** Rich HTML or plain text → plain text for form fill and CV parsing. */
export function htmlToPlainText(html) {
  const raw = String(html || "").trim();
  if (!raw) return "";
  if (!isRichHtml(raw)) return raw;

  if (typeof DOMParser === "undefined") {
    return raw
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/h[1-6]>/gi, "\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  const doc = new DOMParser().parseFromString(raw, "text/html");
  const walk = (node, out) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = node.textContent || "";
      if (t) out.push(t);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = node.tagName;
    if (tag === "BR") {
      out.push("\n");
      return;
    }
    if (tag === "LI") out.push("• ");
    const block = ["P", "DIV", "H1", "H2", "H3", "UL", "OL", "LI"].includes(tag);
    for (const child of node.childNodes) walk(child, out);
    if (block) out.push("\n");
  };

  const parts = [];
  for (const child of doc.body.childNodes) walk(child, parts);
  return parts
    .join("")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Normalize stored value to HTML for the editor. */
export function normalizeEditorHtml(value) {
  return plainTextToDocumentHtml(value || "");
}

/** Sanitized HTML body for preview / PDF / Word export. */
export function bodyHtmlForExport(value) {
  const raw = value?.trim() || "";
  if (!raw) return "";
  return isRichHtml(raw) ? sanitizeRichHtml(raw) : plainTextToDocumentHtml(raw);
}
