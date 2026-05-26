import { wrapCvPageShell } from "./cv-template-utils.js";
import { MINIMAL_CV_PAGE_CSS } from "./word-html-import.js";
import { escapeHtmlText } from "./cv-html.js";
import { bodyHtmlForExport } from "./document-rich-text.js";
import { downloadBase64File, generateCvPdfBase64 } from "./cv-export.js";

export { bodyHtmlForExport };

const REVIEW_DOC_CSS = `
  .review-doc-body {
    font-family: Calibri, "Segoe UI", Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.45;
    color: #111;
  }
  .review-doc-body h1 { font-size: 18pt; font-weight: 700; margin: 0 0 8px; }
  .review-doc-body h2 { font-size: 12pt; font-weight: 700; margin: 14px 0 6px; text-transform: uppercase; letter-spacing: 0.02em; }
  .review-doc-body h3 { font-size: 11pt; font-weight: 600; margin: 10px 0 4px; }
  .review-doc-body p { margin: 4px 0; }
  .review-doc-body ul { margin: 4px 0 8px; padding-left: 1.35em; }
  .review-doc-body a { color: #1a56db; text-decoration: underline; }
`;

export function wrapEditorHtmlForPrint(bodyHtml, title = "Document") {
  const safeTitle = escapeHtmlText(title);
  const inner = `<article class="review-doc-body"><h1>${safeTitle}</h1>${bodyHtml}</article>`;
  return wrapCvPageShell(inner, `${MINIMAL_CV_PAGE_CSS}\n${REVIEW_DOC_CSS}`);
}

export async function downloadEditorPdf(value, filename) {
  const body = bodyHtmlForExport(value);
  if (!body) throw new Error("Nothing to export — add content first.");
  const html = wrapEditorHtmlForPrint(body, filename.replace(/\.(pdf|docx?|html)$/i, ""));
  const base64 = await generateCvPdfBase64({ html });
  const name = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  downloadBase64File(base64, name, "application/pdf");
}

export function downloadEditorWord(value, filename) {
  const body = bodyHtmlForExport(value);
  if (!body) throw new Error("Nothing to export — add content first.");
  const html = wrapEditorHtmlForPrint(body, filename.replace(/\.(pdf|docx?|html)$/i, ""));
  const blob = new Blob(["\ufeff", html], {
    type: "application/msword;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = /\.docx?$/i.test(filename) ? filename : `${filename}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadEditorHtmlFile(value, filename) {
  const body = bodyHtmlForExport(value);
  if (!body) throw new Error("Nothing to export — add content first.");
  const html = wrapEditorHtmlForPrint(body, filename.replace(/\.(pdf|docx?|html)$/i, ""));
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".html") ? filename : `${filename}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
