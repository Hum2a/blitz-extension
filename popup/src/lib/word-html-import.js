import { wrapCvPageShell, extractStyleBlock } from "./cv-template-utils.js";
import { DEFAULT_CV_HTML_TEMPLATE } from "./cv-template-default.js";

/** Minimal A4 shell — keeps Word/Mammoth layout instead of Blitz default typography. */
export const MINIMAL_CV_PAGE_CSS = `
  @page { size: A4; margin: 12mm 14mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0;
    width: 210mm;
    background: #fff;
  }
  .cv-page {
    padding: 0;
    width: 100%;
  }
`;

export const WORD_HTML_IMPORT_GUIDE = `Best match to your original Word CV

1. Open your CV in Microsoft Word (desktop).
2. File → Save As → pick a folder.
3. Save as type: "Web Page, Filtered (*.htm)" (or "Single File Web Page (*.htm)").
4. In Blitz Settings → CV layout → Import Word → upload that .htm file
   OR open the .htm in Notepad, Select All, Copy, then Paste HTML here.
5. Replace fixed text (your name, etc.) with template variables like {{fullName}} and {{#jobs}}…{{/jobs}}.
6. Save template.

Why: Filtered HTML keeps Word fonts, spacing, and tables much closer than .docx conversion.
.docx import is quicker but layout often drifts from the original.`;

/**
 * Build a full CV template document from raw HTML (e.g. Word Save As web page).
 */
export function rawHtmlToCvTemplate(rawHtml, { preserveLayout = true } = {}) {
  const input = String(rawHtml || "").trim();
  if (!input) throw new Error("No HTML to import");

  const styleBlocks = [];
  for (const m of input.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    styleBlocks.push(m[1]);
  }

  let bodyInner = "";
  const bodyMatch = input.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) {
    bodyInner = bodyMatch[1].trim();
  } else if (/<html[\s>]/i.test(input)) {
    const afterHead = input.replace(/<head[\s\S]*?<\/head>/i, "");
    bodyInner = afterHead
      .replace(/<\/?html[^>]*>/gi, "")
      .replace(/<\/?body[^>]*>/gi, "")
      .trim();
  } else {
    bodyInner = input;
  }

  bodyInner = bodyInner
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .trim();

  const mergedCss = [
    preserveLayout ? MINIMAL_CV_PAGE_CSS : extractStyleBlock(DEFAULT_CV_HTML_TEMPLATE),
    ...styleBlocks,
  ]
    .filter(Boolean)
    .join("\n");

  const banner = `<!-- Imported HTML — map static text to {{variables}}. See Template variable reference. -->`;

  return wrapCvPageShell(`${banner}\n${bodyInner}`, mergedCss);
}

export async function htmlFileToCvTemplate(file, options = {}) {
  const name = file.name?.toLowerCase() || "";
  if (!/\.(htm|html)$/.test(name)) {
    throw new Error("Upload a .htm or .html file (Word “Web Page, Filtered”).");
  }
  const text = await file.text();
  return {
    html: rawHtmlToCvTemplate(text, options),
    warnings: [],
  };
}
