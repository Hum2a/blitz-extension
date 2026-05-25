import { wrapCvPageShell, extractStyleBlock } from "./cv-template-utils.js";
import { DEFAULT_CV_HTML_TEMPLATE } from "./cv-template-default.js";
import { MINIMAL_CV_PAGE_CSS } from "./word-html-import.js";

/**
 * Convert a Word .docx file to an HTML CV template (body + page shell).
 * @param {{ preserveLayout?: boolean }} options — minimal CSS when true (closer to Word structure)
 */
export async function docxFileToCvTemplate(file, options = {}) {
  const { preserveLayout = false } = options;
  const mammoth = await import("mammoth");
  const buffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml(
    { arrayBuffer: buffer },
    {
      ignoreEmptyParagraphs: false,
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Title'] => h1:fresh",
        "r[style-name='Strong'] => strong",
      ],
    }
  );

  const bodyHtml = result.value?.trim() || "<p>Imported from Word — add template variables.</p>";
  const css = preserveLayout
    ? MINIMAL_CV_PAGE_CSS
    : extractStyleBlock(DEFAULT_CV_HTML_TEMPLATE);
  const html = wrapCvPageShell(`${importBannerHtml()}\n${bodyHtml}`, css);

  return {
    html,
    warnings: (result.messages || []).map((m) => m.message).filter(Boolean),
  };
}

function importBannerHtml() {
  return `<!-- Replace static text with {{fullName}}, {{summary}}, {{#jobs}}... etc. See Settings → Template variables -->`;
}
