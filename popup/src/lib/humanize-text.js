/**
 * Replace em dashes (U+2014) that read as AI-generated in UK/US job copy.
 * Keeps en dashes (U+2013) for date ranges e.g. "2020–2024".
 */
export function stripEmDashes(text) {
  if (text == null || typeof text !== "string") return text;
  return text
    .replace(/\s*\u2014\s*/g, ", ")
    .replace(/,\s*,/g, ",")
    .replace(/\s+,/g, ",")
    .replace(/,\s+\./g, ".")
    .trim();
}

export function humanizeGeneratedText(value) {
  if (typeof value === "string") return stripEmDashes(value);
  if (Array.isArray(value)) return value.map(humanizeGeneratedText);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = humanizeGeneratedText(v);
    }
    return out;
  }
  return value;
}
