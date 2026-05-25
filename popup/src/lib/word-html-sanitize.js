/**
 * Word "Web Page" (.htm) cleanup: windows-1252 decoding + real HTML lists.
 */

const REPLACEMENT_CHAR = "\uFFFD";
const MOJIBAKE_SEQ = "ï¿½";

const MSO_LIST_PARA_RE = /<p([^>]*\bMsoListParagraph\b[^>]*)>([\s\S]*?)<\/p>/gi;

const LIST_MARKER_BLOCK_RE =
  /<!\[if\s*!supportLists\][\s\S]*?<!\[endif]>/gi;
const MSO_LIST_IGNORE_RE = /<span[^>]*\bmso-list:Ignore\b[^>]*>[\s\S]*?<\/span>/gi;
const OOXML_TAG_RE = /<\/?o:p[^>]*>/gi;

/** Only count broken encoding artefacts (not list bullets). */
const ENCODING_ARTIFACTS = [REPLACEMENT_CHAR, MOJIBAKE_SEQ];

/**
 * Count encoding fixes only (not list normalisation).
 */
export function countWordHtmlSanitizeFixes(html) {
  if (!html) return 0;
  const s = String(html);
  let n = 0;
  for (const ch of ENCODING_ARTIFACTS) {
    const parts = s.split(ch);
    if (parts.length > 1) n += parts.length - 1;
  }
  return n;
}

/**
 * Map broken characters in visible text — bullets stay as list markers via <ul>/<li>.
 */
function fixReplacementCharInText(text) {
  return String(text)
    .replace(/\uFFFD/g, (_m, idx, full) => {
      const prev = full[idx - 1];
      const next = full[idx + 1];
      if (/\d/.test(prev) && /\d/.test(next)) return "–";
      if (/\s/.test(prev) && /\s/.test(next)) return "·";
      return "";
    })
    .replace(/ï¿½/g, "·");
}

function fixEncodingBetweenTags(html) {
  return html.replace(/>([^<]+)</g, (_match, text) => {
    if (!text.trim()) return `>${text}<`;
    return `>${fixReplacementCharInText(text)}<`;
  });
}

function cleanListParagraphInner(inner) {
  let c = inner;
  c = c.replace(LIST_MARKER_BLOCK_RE, "");
  c = c.replace(MSO_LIST_IGNORE_RE, "");
  c = c.replace(OOXML_TAG_RE, "");
  c = c.replace(/<span[^>]*>\s*<\/span>/gi, "");
  c = c.replace(/^[\s\u2022\u00b7\u2219\u25aa\u25cf\uFFFD•·–—\-]+/u, "");
  c = fixEncodingBetweenTags(c);
  return c.trim();
}

/**
 * Word uses MsoListParagraph + conditional bullets, not <li>. Convert to semantic lists.
 */
export function normalizeWordListsInHtml(html) {
  if (!html) return html;

  let out = String(html).replace(MSO_LIST_PARA_RE, (_full, _attrs, inner) => {
    const body = cleanListParagraphInner(inner);
    if (!body) return "";
    return `<li class="word-cv-li">${body}</li>`;
  });

  out = out.replace(/(?:<li class="word-cv-li">[\s\S]*?<\/li>\s*)+/gi, (block) => {
    return `<ul class="word-cv-ul">\n${block}</ul>\n`;
  });

  return out;
}

/**
 * Full Word HTML cleanup: lists first, then encoding in text nodes only.
 */
export function sanitizeWordImportedHtml(html) {
  if (html == null) return html;
  let out = normalizeWordListsInHtml(String(html));
  out = fixEncodingBetweenTags(out);
  return out;
}

/**
 * Detect charset from Word HTML meta and decode bytes correctly.
 */
export function decodeWordHtmlBytes(buffer) {
  const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
  const headLen = Math.min(bytes.length, 12000);
  const headLatin = new TextDecoder("iso-8859-1").decode(bytes.slice(0, headLen));
  let charset = "windows-1252";
  const metaMatch = headLatin.match(/charset\s*=\s*([^\s"'>;]+)/i);
  if (metaMatch?.[1]) {
    const raw = metaMatch[1].toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (raw === "utf8" || raw === "utf-8") charset = "utf-8";
    else if (raw.includes("1252") || raw === "windows1252") charset = "windows-1252";
    else if (raw === "iso88591" || raw === "latin1") charset = "iso-8859-1";
  }

  const tryDecode = (label) => {
    try {
      return new TextDecoder(label).decode(bytes);
    } catch {
      return null;
    }
  };

  return tryDecode(charset) || tryDecode("windows-1252") || tryDecode("utf-8") || "";
}

export async function readWordHtmlFileText(file) {
  const buffer = await file.arrayBuffer();
  return decodeWordHtmlBytes(buffer);
}
