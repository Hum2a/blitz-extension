/**
 * Rich HTML helpers for CV templates (links, sanitization).
 */

const ALLOWED_TAGS = new Set([
  "A",
  "B",
  "STRONG",
  "I",
  "EM",
  "U",
  "BR",
  "P",
  "SPAN",
  "UL",
  "OL",
  "LI",
  "H1",
  "H2",
  "H3",
  "DIV",
]);

function escapeAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

export function escapeHtmlText(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeUrl(url) {
  const s = String(url || "").trim();
  if (!s) return "";
  if (/^mailto:/i.test(s)) return s;
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
}

export function anchorHtml(label, url) {
  const href = normalizeUrl(url);
  if (!href) return escapeHtmlText(label);
  return `<a href="${escapeAttr(href)}">${escapeHtmlText(label)}</a>`;
}

/** Build contact row with real hyperlinks from profile. */
export function buildContactLineHtml(profile = {}) {
  const line1 = [];
  if (profile.location?.trim()) line1.push(escapeHtmlText(profile.location.trim()));
  if (profile.phone?.trim()) line1.push(escapeHtmlText(profile.phone.trim()));
  if (profile.email?.trim()) {
    line1.push(
      anchorHtml(profile.email.trim(), `mailto:${profile.email.trim()}`)
    );
  }

  const links = [];
  if (profile.github?.trim()) links.push(anchorHtml("GitHub", profile.github));
  if (profile.portfolio?.trim()) links.push(anchorHtml("Portfolio", profile.portfolio));
  if (profile.linkedin?.trim()) links.push(anchorHtml("LinkedIn", profile.linkedin));

  const parts = [];
  if (line1.length) parts.push(line1.join(" • "));
  if (links.length) parts.push(links.join(" | "));
  return parts.join("<br />");
}

const LINK_LABELS = [
  { label: "GitHub", key: "github" },
  { label: "Portfolio", key: "portfolio" },
  { label: "LinkedIn", key: "linkedin" },
];

/** Turn plain "GitHub | Portfolio" text into anchors when profile URLs exist. */
export function linkifyPlainContact(plain, profile = {}) {
  if (!plain?.trim()) return "";
  if (/<a\s/i.test(plain)) return sanitizeRichHtml(plain);

  let html = escapeHtmlText(plain);
  for (const { label, key } of LINK_LABELS) {
    const url = profile[key]?.trim();
    if (!url) continue;
    const re = new RegExp(`\\b${label}\\b`, "gi");
    html = html.replace(re, () => anchorHtml(label, url));
  }
  html = html.replace(/\s\|\s/g, " | ");
  html = html.replace(/•/g, "•");
  return html;
}

export function plainTextToSummaryHtml(text) {
  if (!text?.trim()) return "";
  if (/<[a-z][\s>]/i.test(text)) return sanitizeRichHtml(text);
  return `<p>${escapeHtmlText(text.trim())}</p>`;
}

export function sanitizeRichHtml(html) {
  if (!html?.trim()) return "";
  if (typeof DOMParser === "undefined") return escapeHtmlText(html);

  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return "";

  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) return;
    if (node.nodeType !== Node.ELEMENT_NODE) {
      node.remove();
      return;
    }
    if (!ALLOWED_TAGS.has(node.tagName)) {
      const parent = node.parentNode;
      while (node.firstChild) parent.insertBefore(node.firstChild, node);
      parent.removeChild(node);
      return;
    }
    if (node.tagName === "A") {
      const href = normalizeUrl(node.getAttribute("href") || "");
      if (!href || /^javascript:/i.test(href)) {
        const text = node.textContent || "";
        const span = doc.createTextNode(text);
        node.replaceWith(span);
        return;
      }
      node.setAttribute("href", href);
      node.setAttribute("rel", "noopener noreferrer");
      [...node.attributes].forEach((attr) => {
        if (!["href", "rel"].includes(attr.name)) node.removeAttribute(attr.name);
      });
    } else {
      [...node.attributes].forEach((attr) => node.removeAttribute(attr.name));
    }
    [...node.childNodes].forEach(walk);
  };

  [...root.childNodes].forEach(walk);
  return root.innerHTML.trim();
}

export function enrichCvDocumentRichFields(doc, userProfile = {}) {
  if (!doc || typeof doc !== "object") return doc;

  const contactLineHtml =
    doc.contactLineHtml?.trim() ||
    linkifyPlainContact(doc.contactLine, userProfile) ||
    buildContactLineHtml(userProfile);

  const summaryHtml =
    doc.summaryHtml?.trim() || plainTextToSummaryHtml(doc.summary);

  const careerNoteHtml = doc.careerNote?.trim()
    ? sanitizeRichHtml(doc.careerNoteHtml?.trim() || doc.careerNote)
    : "";

  const jobs = (doc.jobs || []).map((j) => ({
    ...j,
    bullets: (j.bullets || []).map((b) => {
      const raw = typeof b === "string" ? b : b?.html || b?.text || "";
      const text = typeof b === "string" ? b : b?.text || raw.replace(/<[^>]+>/g, "");
      return { text, html: sanitizeRichHtml(raw) };
    }),
  }));

  return {
    ...doc,
    contactLine: doc.contactLine,
    contactLineHtml: sanitizeRichHtml(contactLineHtml),
    summaryHtml: sanitizeRichHtml(summaryHtml),
    careerNoteHtml,
    jobs,
  };
}
