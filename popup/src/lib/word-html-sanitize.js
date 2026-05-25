/**
 * Word "Web Page" exports often use windows-1252. Reading as UTF-8 yields U+FFFD ().
 */

const REPLACEMENT_CHAR = "\uFFFD";
const MOJIBAKE_SEQ = "ï¿½";

/** Characters Word uses that we normalize to a full stop when sanitising. */
const WORD_PUNCT_TO_STOP = [
  REPLACEMENT_CHAR,
  MOJIBAKE_SEQ,
  "\u00b7", // middle dot ·
  "\u2022", // bullet •
  "\u2023",
  "\u2219",
  "\u25aa",
  "\u25cf",
];

/**
 * Count how many sanitise replacements would be made (for UI feedback).
 */
export function countWordHtmlSanitizeFixes(html) {
  if (!html) return 0;
  const s = String(html);
  let n = 0;
  for (const ch of WORD_PUNCT_TO_STOP) {
    const parts = s.split(ch);
    if (parts.length > 1) n += parts.length - 1;
  }
  return n;
}

/**
 * Replace Word/encoding artefacts with ASCII full stops (or custom replacement).
 * Collapses repeated replacements and trims " ." spacing slightly.
 */
export function sanitizeWordImportedHtml(html, { replacement = "." } = {}) {
  if (html == null) return html;
  let out = String(html);

  for (const ch of WORD_PUNCT_TO_STOP) {
    if (!ch) continue;
    out = out.split(ch).join(replacement);
  }

  const rep = replacement.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  out = out.replace(new RegExp(`${rep}{2,}`, "g"), replacement);
  out = out.replace(new RegExp(`\\s+${rep}\\s+`, "g"), ` ${replacement} `);

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
