import {
  wrapCvPageShell,
  extractStyleBlock,
} from "./cv-template-utils.js";
import { DEFAULT_CV_HTML_TEMPLATE } from "./cv-template-default.js";

/**
 * Convert a Word .docx file to an HTML CV template (body + default shell).
 */
export async function docxFileToCvTemplate(file) {
  const mammoth = await import("mammoth");
  const buffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml(
    { arrayBuffer: buffer },
    {
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
      ],
    }
  );

  const bodyHtml = result.value?.trim() || "<p>Imported from Word — add template variables.</p>";
  const defaultCss = extractStyleBlock(DEFAULT_CV_HTML_TEMPLATE);
  const html = wrapCvPageShell(
    `${importBannerHtml()}\n${bodyHtml}`,
    defaultCss
  );

  return {
    html,
    warnings: (result.messages || []).map((m) => m.message).filter(Boolean),
  };
}

function importBannerHtml() {
  return `<!-- Replace static text with {{fullName}}, {{summary}}, {{#jobs}}... etc. See Settings → Template variables -->`;
}
