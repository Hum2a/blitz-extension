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

async function renderTemplateWithDoc(template, doc, userProfile) {
  if (isHumzaWordCvTemplate(template)) {
    const { html, changed } = injectHumzaWordCvTemplate(template, doc, userProfile);
    return { html, injected: changed };
  }

  if (templateHasMustacheVariables(template)) {
    return { html: renderCvHtml(template, doc), injected: true };
  }

  const { html, changed } = injectHumzaWordCvTemplate(template, doc, userProfile);
  return { html, injected: changed };
}

/**
 * Merge tailored CV + template. Never uses stale manual override.
 */
export async function applyTailoredCvToPdfLayout({
  cvDocument,
  tailoredCV,
  userProfile,
}) {
  const doc = resolveCvDocument({ cvDocument, tailoredCV, userProfile });
  if (!doc) {
    throw new Error("No CV content — add text in Tailored CV first.");
  }
  if (!tailoredCV?.trim() && !doc.summary?.trim() && !(doc.jobs?.length > 0)) {
    throw new Error("Tailored CV is empty — generate or paste content first.");
  }

  const template = await getCvHtmlTemplate();
  const { html, injected } = await renderTemplateWithDoc(template, doc, userProfile);

  if (!injected) {
    throw new Error(
      "Could not merge tailored CV into your template. Re-import your Word .htm in Settings → CV layout, then try again."
    );
  }

  return { html, injected };
}

export async function buildRenderedCvHtml({
  cvDocument,
  tailoredCV,
  userProfile,
  htmlOverride,
  pdfLayoutHtml,
  useManualOverride = false,
}) {
  if (useManualOverride && htmlOverride?.trim()) {
    return htmlOverride.trim();
  }
  if (pdfLayoutHtml?.trim()) {
    return pdfLayoutHtml.trim();
  }

  const doc = resolveCvDocument({ cvDocument, tailoredCV, userProfile });
  if (!doc) throw new Error("No CV content to render");
  const template = await getCvHtmlTemplate();
  const { html } = await renderTemplateWithDoc(template, doc, userProfile);
  return html;
}

export async function resolvePdfHtmlForExport({
  cvDocument,
  tailoredCV,
  userProfile,
  htmlOverride,
  useManualOverride = false,
}) {
  if (useManualOverride && htmlOverride?.trim()) {
    return { html: htmlOverride.trim(), source: "manual" };
  }

  const applied = await applyTailoredCvToPdfLayout({
    cvDocument,
    tailoredCV,
    userProfile,
  });
  return { html: applied.html, source: "applied" };
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
  useManualOverride = false,
  html,
}) {
  const resolvedHtml =
    html?.trim() ||
    (
      await resolvePdfHtmlForExport({
        cvDocument,
        tailoredCV,
        userProfile,
        htmlOverride,
        useManualOverride,
      })
    ).html;

  const base64 = await generateCvPdfBase64({ html: resolvedHtml });
  const name =
    filename ||
    `${(cvDocument?.fullName || "CV").replace(/[^\w\s-]/g, "").trim() || "CV"} - Blitz.pdf`;
  downloadBase64File(base64, name.endsWith(".pdf") ? name : `${name}.pdf`, "application/pdf");
}
