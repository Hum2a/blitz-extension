import { getStorage } from "./storage.js";
import { DEFAULT_CV_HTML_TEMPLATE } from "./cv-template-default.js";
import { renderCvHtml } from "./cv-template-engine.js";
import { resolveCvDocument } from "./cv-document.js";
import {
  injectHumzaWordCvTemplate,
  isHumzaWordCvTemplate,
  templateHasMustacheVariables,
} from "./humza-word-cv-inject.js";

export async function getCvHtmlTemplate() {
  const stored = await getStorage("cv_html_template");
  return (stored && String(stored).trim()) || DEFAULT_CV_HTML_TEMPLATE;
}

export async function buildRenderedCvHtml({
  cvDocument,
  tailoredCV,
  userProfile,
  htmlOverride,
}) {
  if (htmlOverride?.trim()) return htmlOverride.trim();
  const doc = resolveCvDocument({ cvDocument, tailoredCV, userProfile });
  if (!doc) throw new Error("No CV content to render");
  const template = await getCvHtmlTemplate();

  if (isHumzaWordCvTemplate(template)) {
    return injectHumzaWordCvTemplate(template, doc, userProfile);
  }

  if (templateHasMustacheVariables(template)) {
    return renderCvHtml(template, doc);
  }

  return injectHumzaWordCvTemplate(template, doc, userProfile);
}

export async function generateCvPdfBase64(payload) {
  const result = await chrome.runtime.sendMessage({
    type: "GENERATE_PDF",
    payload,
  });
  if (chrome.runtime.lastError) {
    throw new Error(chrome.runtime.lastError.message);
  }
  if (result?.error) throw new Error(result.error);
  if (!result?.base64) throw new Error("PDF generation returned no data");
  return result.base64;
}

export function downloadBase64File(base64, filename, mimeType) {
  const bytes = atob(base64);
  const buf = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
  const blob = new Blob([buf], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadCvPdf({
  cvDocument,
  tailoredCV,
  userProfile,
  filename,
  htmlOverride,
  html,
}) {
  const resolvedHtml =
    html?.trim() ||
    htmlOverride?.trim() ||
    (await buildRenderedCvHtml({ cvDocument, tailoredCV, userProfile }));
  const base64 = await generateCvPdfBase64({ html: resolvedHtml });
  const name =
    filename ||
    `${(cvDocument?.fullName || "CV").replace(/[^\w\s-]/g, "").trim() || "CV"} - Blitz.pdf`;
  downloadBase64File(base64, name.endsWith(".pdf") ? name : `${name}.pdf`, "application/pdf");
}
