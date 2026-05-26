/**
 * Canonical CV header from Settings → user profile (name, location, links).
 */

import {
  anchorHtml,
  escapeHtmlText,
  linkifyPlainContact,
} from "./cv-html.js";
import { htmlToPlainText } from "./document-rich-text.js";

const SECTION_HEADER_RE =
  /^(professional summary|summary|education|technical skills|skills|career|experience|work experience)\b/i;

/** Three-line plain header for tailoredCV. */
export function buildCvHeaderPlainText(profile = {}) {
  const name = profile.name?.trim() || "Curriculum Vitae";

  const loc = profile.location?.trim();
  const phone = profile.phone?.trim();
  let line2 = "";
  if (loc || phone) {
    const parts = [];
    if (loc) parts.push(loc);
    if (phone) parts.push(phone);
    line2 = `• ${parts.join(" • ")}`;
  }

  const email = profile.email?.trim();
  const line3Parts = [];
  if (email) line3Parts.push(email);
  if (profile.github?.trim()) line3Parts.push("GitHub");
  if (profile.portfolio?.trim()) line3Parts.push("Portfolio");
  if (profile.linkedin?.trim()) line3Parts.push("LinkedIn");
  const line3 = line3Parts.join(" | ");

  return [name, line2, line3].filter((l) => l.trim()).join("\n");
}

/** Lines 2–3 of the header (for cvDocument.contactLine). */
export function buildCvHeaderContactLinePlain(profile = {}) {
  const lines = buildCvHeaderPlainText(profile).split("\n");
  return lines.slice(1).join("\n");
}

/** HTML contact block under fullName (location/phone row + email/links row). */
export function buildCvHeaderContactLineHtml(profile = {}) {
  const lines = buildCvHeaderPlainText(profile).split("\n");
  const line2 = lines[1] || "";
  const line3 = lines[2] || "";
  const line2Html = line2 ? escapeHtmlText(line2) : "";
  const line3Html = line3 ? linkifyPlainContact(line3, profile) : "";
  return [line2Html, line3Html].filter(Boolean).join("<br />");
}

/** Remove a leading name/contact block so we can re-apply the canonical header. */
export function stripLeadingCvHeader(text) {
  const plain = htmlToPlainText(text || "") || String(text || "");
  if (!plain.trim()) return plain;

  const lines = plain.split(/\r?\n/);
  let i = 0;
  while (i < lines.length && !lines[i].trim()) i++;
  if (i >= lines.length) return plain;
  if (SECTION_HEADER_RE.test(lines[i].trim())) return plain;

  let end = i;
  for (let j = i; j < Math.min(lines.length, i + 8); j++) {
    const t = lines[j].trim();
    if (!t) {
      end = j + 1;
      continue;
    }
    if (SECTION_HEADER_RE.test(t)) break;
    end = j + 1;
  }

  const headerLines = lines.slice(i, end).filter((l) => l.trim());
  if (!headerLines.length) return plain;
  if (SECTION_HEADER_RE.test(headerLines[0].trim())) return plain;

  return lines
    .slice(end)
    .join("\n")
    .replace(/^\n+/, "")
    .trimStart();
}

/** Ensure tailoredCV starts with the profile header. */
export function applyTailoredCvHeader(tailoredCV, profile = {}) {
  const body = stripLeadingCvHeader(tailoredCV || "");
  const header = buildCvHeaderPlainText(profile);
  if (!header.trim()) return body;
  return body ? `${header}\n\n${body}` : header;
}

/** Sync cvDocument header fields from Settings profile. */
export function applyCvDocumentProfileHeader(cvDocument, profile = {}) {
  if (!cvDocument || typeof cvDocument !== "object") return cvDocument;
  const name = profile.name?.trim();
  return {
    ...cvDocument,
    ...(name ? { fullName: name } : {}),
    contactLine: buildCvHeaderContactLinePlain(profile),
    contactLineHtml: buildCvHeaderContactLineHtml(profile),
  };
}

/** Apply canonical header to a parsed generation result. */
export function applyProfileCvHeader(application, profile = {}) {
  if (!application) return application;
  return {
    ...application,
    tailoredCV: applyTailoredCvHeader(application.tailoredCV, profile),
    cvDocument: application.cvDocument
      ? applyCvDocumentProfileHeader(application.cvDocument, profile)
      : application.cvDocument,
  };
}
