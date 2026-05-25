/**
 * Bespoke injector for Humza's Word-exported CV HTML (no {{mustache}} tags).
 * Replaces header + section bodies while preserving Word layout/styles.
 */

import { normalizeCvDocument } from "./cv-template-engine.js";
import {
  enrichCvDocumentRichFields,
  escapeHtmlText,
  buildContactLineHtml,
  sanitizeRichHtml,
} from "./cv-html.js";

const SECTION_MARKERS = [
  { key: "summary", re: /Professional\s+Summary/i },
  { key: "education", re: /Education\s*<o:p>/i },
  { key: "skills", re: /Technical\s+Skills/i },
  { key: "career", re: /Career\s*\(/i },
];

export function templateHasMustacheVariables(html) {
  return /\{\{[#\/]?[\w.]+\}\}/.test(html || "");
}

/** Word .htm export with titled sections but no template variables. */
export function isHumzaWordCvTemplate(html) {
  const s = html || "";
  if (templateHasMustacheVariables(s)) return false;
  return (
    /professional\s+summary/i.test(s) &&
    (/technical\s+skills/i.test(s) || /education/i.test(s)) &&
    (/career\s*\(/i.test(s) || /career/i.test(s))
  );
}

function normalizeForCompare(html) {
  return (html || "").replace(/\s+/g, " ").trim();
}

function findMarkerIndex(html, re) {
  const m = html.match(re);
  return m ? m.index : -1;
}

function contentStartAfterHeading(html, headingIndex) {
  const slice = html.slice(headingIndex);
  const borderClose = slice.indexOf("</div>");
  if (borderClose >= 0 && borderClose < 800) {
    return headingIndex + borderClose + "</div>".length;
  }
  const pClose = slice.indexOf("</p>");
  return pClose >= 0 ? headingIndex + pClose + "</p>".length : headingIndex;
}

function findHumzaSectionRanges(html) {
  const hits = SECTION_MARKERS.map(({ key, re }) => ({
    key,
    index: findMarkerIndex(html, re),
  })).filter((h) => h.index >= 0);

  hits.sort((a, b) => a.index - b.index);

  const ranges = {};
  const bodyStart = html.search(/<body[\s>]/i);
  const bodyContentStart =
    bodyStart >= 0 ? html.indexOf(">", bodyStart) + 1 : 0;
  const firstSection = hits[0]?.index ?? -1;

  if (bodyContentStart > 0 && firstSection > bodyContentStart) {
    ranges.header = { start: bodyContentStart, end: firstSection };
  }

  for (let i = 0; i < hits.length; i++) {
    const { key, index } = hits[i];
    const start = contentStartAfterHeading(html, index);
    const end = i + 1 < hits.length ? hits[i + 1].index : html.length;
    ranges[key] = { start, end };
  }

  return ranges;
}

function replaceRange(html, range, replacement) {
  if (!range || range.start == null || range.end == null) return html;
  return html.slice(0, range.start) + replacement + html.slice(range.end);
}

function extractSnippet(html, re, fallback) {
  const m = html.match(re);
  return m ? m[0] : fallback;
}

function buildHeaderHtml(data, userProfile, template) {
  const name = escapeHtmlText(data.fullName || userProfile?.name || "Curriculum Vitae");

  const contactHtml =
    data.contactLineHtml?.trim() || buildContactLineHtml(userProfile);

  const line1Parts = [];
  if (userProfile?.location?.trim()) {
    line1Parts.push(`• ${escapeHtmlText(userProfile.location.trim())}`);
  }
  if (userProfile?.phone?.trim()) {
    line1Parts.push(escapeHtmlText(userProfile.phone.trim()));
  }
  const line1 =
    line1Parts.length > 0
      ? `<p class=MsoNormal><span style='font-size:9.0pt;color:windowtext'>${line1Parts.join(" ")} <o:p></o:p></span></p>`
      : "";

  const line2 = contactHtml.includes("<a ")
    ? `<p class=MsoNormal><span style='font-size:9.0pt;color:windowtext'>${sanitizeRichHtml(contactHtml).replace(/<br\s*\/?>/gi, " ")} <o:p></o:p></span></p>`
    : buildHumzaContactLine2(data, userProfile, template);

  const nameP =
    extractSnippet(
      template,
      /<p class=MsoNormal><span[^>]*>Humza Butt[\s\S]*?<\/p>/i,
      `<p class=MsoNormal><span style='color:windowtext'>${name} <o:p></o:p></span></p>`
    ).replace(/Humza Butt/i, name) ||
    `<p class=MsoNormal><span style='color:windowtext'>${name} <o:p></o:p></span></p>`;

  return nameP + line1 + line2;
}

function buildHumzaContactLine2(data, userProfile, template) {
  const email = userProfile?.email?.trim() || "";
  const gh = userProfile?.github?.trim() || "";
  const pf = userProfile?.portfolio?.trim() || "";
  const li = userProfile?.linkedin?.trim() || "";

  const emailPart = email
    ? `<b><span style='font-size:9.0pt;color:windowtext'>${escapeHtmlText(email)}</span></b>`
    : "";

  const link = (label, url) =>
    url
      ? `<a href="${url.replace(/"/g, "&quot;")}"><span style='font-size:9.0pt;mso-bidi-font-weight:bold'>${label}</span></a>`
      : "";

  const links = [
    link("GitHub", gh),
    link("Portfolio", pf),
    link("LinkedIn", li),
  ].filter(Boolean);

  const sep = "<span style='font-size:9.0pt;color:windowtext'> | </span>";
  const inner = [emailPart, ...links].filter(Boolean).join(sep);

  return (
    extractSnippet(
      template,
      /<p class=MsoNormal><b><span[^>]*>humza[\s\S]*?<\/p>/i,
      `<p class=MsoNormal>${inner}<o:p></o:p></p>`
    ) || `<p class=MsoNormal>${inner}<o:p></o:p></p>`
  );
}

function buildSummarySectionHtml(data, template) {
  const inner = data.summaryHtml?.trim() || escapeHtmlText(data.summary || "");
  const text = inner.replace(/^<p>|<\/p>$/gi, "").trim();

  const proto =
    extractSnippet(
      template,
      /<p class=MsoNormal style='text-align:justify'><span style='font-family:"Calibri Light"[\s\S]*?<\/p>/i,
      null
    ) || `<p class=MsoNormal style='text-align:justify'><span style='font-family:"Calibri Light",sans-serif;color:windowtext'>{{TEXT}}<o:p></o:p></span></p>`;

  if (proto.includes("{{TEXT}}")) {
    return proto.replace("{{TEXT}}", text);
  }

  return proto.replace(/>([^<]*)<o:p>/i, `>${text}<o:p>`);
}

function buildEducationSectionHtml(data, template) {
  const blocks = (data.education || []).map((edu) => {
    const heading = escapeHtmlText(edu.heading || "");
    const lines = (edu.lines || [])
      .map((line) => {
        const t = typeof line === "string" ? line : line?.text || "";
        return `<p class=MsoNormal style='text-align:justify'><span style='font-family:"Calibri Light",sans-serif;color:windowtext'>${escapeHtmlText(t)}<o:p></o:p></span></p>`;
      })
      .join("");

    const headingP = heading
      ? `<p class=MsoNormal style='margin-right:-2.85pt;text-align:justify'><b><span style='font-family:"Calibri Light",sans-serif;color:windowtext'>${heading}</span></b><o:p></o:p></p>`
      : "";

    return headingP + lines;
  });

  if (blocks.length) return blocks.join("\n");

  return extractSnippet(
    template,
    /<div class=WordSection2>[\s\S]*?<\/div>/i,
    ""
  );
}

function buildSkillsSectionHtml(data) {
  return (data.skillGroups || [])
    .map((sg) => {
      const label = escapeHtmlText(sg.label || "");
      const value = escapeHtmlText(sg.value || "");
      return `<p class=MsoNormal style='text-align:justify'><b><span style='font-family:"Calibri Light",sans-serif;color:windowtext'>${label}</span></b><span style='font-family:"Calibri Light",sans-serif;color:windowtext'>: ${value}<o:p></o:p></span></p>`;
    })
    .join("\n");
}

function buildCareerSectionHtml(data, template) {
  const note = data.careerNoteHtml?.trim() || data.careerNote?.trim() || "";
  const noteP = note
    ? `<p class=MsoNormal style='text-align:justify'><span style='font-family:"Calibri Light",sans-serif;color:windowtext;font-style:italic'>${sanitizeRichHtml(note)}<o:p></o:p></span></p>`
    : "";

  const jobLineProto =
    extractSnippet(
      template,
      /<p class=MsoNormal style='text-align:justify'><b><span[^>]*>Bgr8[\s\S]*?<\/p>/i,
      `<p class=MsoNormal style='text-align:justify'><b><span style='font-family:"Calibri Light",sans-serif;color:windowtext'>{{COMPANY}} | {{ROLE}} </span></b><i><span style='font-family:"Calibri Light",sans-serif;color:windowtext'>{{DATES}} | {{LOCATION}}</span></i><b><span style='font-family:"Calibri Light",sans-serif;color:windowtext'><o:p></o:p></span></b></p>`
    );

  const bulletProto =
    extractSnippet(
      template,
      /<p class=MsoListParagraph style='text-align:justify;text-indent:-18.0pt;[\s\S]*?<\/p>/i,
      `<p class=MsoListParagraph style='text-align:justify;text-indent:-18.0pt;mso-list:l17 level1 lfo42'><span style='font-size:11.0pt;font-family:"Calibri Light",sans-serif;color:windowtext'><span style='mso-list:Ignore'>•<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </span></span></span><span style='font-size:11.0pt;font-family:"Calibri Light",sans-serif;color:windowtext'>{{BULLET}}<o:p></o:p></span></p>`
    );

  const jobsHtml = (data.jobs || [])
    .map((job) => {
      const company = escapeHtmlText(job.company || "");
      const role = escapeHtmlText(job.role || "");
      const dates = escapeHtmlText(job.dates || "");
      const location = escapeHtmlText(job.location || "");

      let line = jobLineProto
        .replace(/\{\{COMPANY\}\}/g, company)
        .replace(/\{\{ROLE\}\}/g, role)
        .replace(/\{\{DATES\}\}/g, dates)
        .replace(/\{\{LOCATION\}\}/g, location);

      if (!jobLineProto.includes("{{COMPANY}}")) {
        line = `<p class=MsoNormal style='text-align:justify'><b><span style='font-family:"Calibri Light",sans-serif;color:windowtext'>${company} | ${role} </span></b><i><span style='font-family:"Calibri Light",sans-serif;color:windowtext'>${dates} | ${location}</span></i><o:p></o:p></p>`;
      }

      const bullets = (job.bullets || [])
        .map((b) => {
          const text = escapeHtmlText(typeof b === "string" ? b : b?.text || "");
          const html = typeof b === "object" && b?.html?.trim() ? sanitizeRichHtml(b.html) : text;
          const inner = html.includes("<") ? html : text;
          return bulletProto.includes("{{BULLET}}")
            ? bulletProto.replace("{{BULLET}}", inner)
            : bulletProto.replace(/>([^<]*)<o:p>/i, `>${inner}<o:p>`);
        })
        .join("\n");

      const tech = job.tech?.trim()
        ? `<p class=MsoNormal style='text-align:justify'><i><span style='font-family:"Calibri Light",sans-serif;color:windowtext'>${escapeHtmlText(job.tech)}<o:p></o:p></span></i></p>`
        : "";

      return line + bullets + tech;
    })
    .join("\n");

  return noteP + jobsHtml;
}

function injectHumzaWordCvTemplateRegex(template, data, userProfile) {
  const ranges = findHumzaSectionRanges(template);
  if (!ranges.summary) return template;

  let html = template;

  if (ranges.header) {
    html = replaceRange(html, ranges.header, buildHeaderHtml(data, userProfile, template));
  }
  if (ranges.summary) {
    html = replaceRange(html, ranges.summary, buildSummarySectionHtml(data, template));
  }
  if (ranges.education) {
    html = replaceRange(html, ranges.education, buildEducationSectionHtml(data, template));
  }
  if (ranges.skills) {
    html = replaceRange(html, ranges.skills, buildSkillsSectionHtml(data));
  }
  if (ranges.career) {
    html = replaceRange(html, ranges.career, buildCareerSectionHtml(data, template));
  }

  return html;
}

function sectionTitlePattern(title) {
  return new RegExp(`^\\s*${title.replace(/[()]/g, "\\$&")}\\s*$`, "i");
}

function findSectionHeadingElement(root, title) {
  const candidates = root.querySelectorAll("p, h1, h2, h3, b, span");
  for (const el of candidates) {
    const text = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (title.toLowerCase() === "career" && /^career\s*\(/i.test(text)) return el;
    if (sectionTitlePattern(title).test(text)) return el;
  }
  return null;
}

function replaceSectionAfterHeading(root, title, htmlFragment) {
  const heading = findSectionHeadingElement(root, title);
  if (!heading) return false;

  let block = heading.closest("div[style*='para-border']") || heading.parentElement;
  let node = block?.nextSibling ?? heading.nextSibling;

  const stopTitles = [
    "Professional Summary",
    "Education",
    "Technical Skills",
    "Career",
  ].filter((t) => t.toLowerCase() !== title.toLowerCase());

  const toRemove = [];
  while (node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const text = node.textContent || "";
      if (stopTitles.some((t) => sectionTitlePattern(t).test(text.replace(/\s+/g, " ").trim()))) {
        break;
      }
      if (stopTitles.some((t) => findSectionHeadingElement(node, t))) break;
    }
    toRemove.push(node);
    node = node.nextSibling;
  }

  for (const n of toRemove) n.remove();

  const wrap = root.ownerDocument.createElement("div");
  wrap.setAttribute("data-blitz-section", title.toLowerCase().replace(/\s+/g, "-"));
  wrap.innerHTML = htmlFragment;
  block.parentNode.insertBefore(wrap, block.nextSibling);
  return true;
}

function injectHumzaWordCvTemplateDom(template, data, userProfile) {
  if (typeof DOMParser === "undefined") return template;
  const parser = new DOMParser();
  const doc = parser.parseFromString(template, "text/html");
  const root = doc.body;
  if (!root) return template;

  const firstHeading = findSectionHeadingElement(root, "Professional Summary");
  if (firstHeading) {
    const headerWrap = doc.createElement("div");
    headerWrap.setAttribute("data-blitz-header", "1");
    headerWrap.innerHTML = buildHeaderHtml(data, userProfile, template);
    const headerBlock =
      firstHeading.closest(".WordSection1") ||
      firstHeading.closest("div")?.parentElement;
    if (headerBlock?.parentNode) {
      let n = headerBlock.previousSibling;
      while (n) {
        const prev = n.previousSibling;
        n.remove();
        n = prev;
      }
      headerBlock.parentNode.insertBefore(headerWrap, headerBlock);
    }
  }

  replaceSectionAfterHeading(
    root,
    "Professional Summary",
    buildSummarySectionHtml(data, template)
  );
  replaceSectionAfterHeading(
    root,
    "Education",
    buildEducationSectionHtml(data, template)
  );
  replaceSectionAfterHeading(
    root,
    "Technical Skills",
    buildSkillsSectionHtml(data)
  );
  replaceSectionAfterHeading(
    root,
    "Career",
    buildCareerSectionHtml(data, template)
  );

  return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
}

/**
 * Inject structured / parsed CV data into Humza's Word HTML template.
 * @returns {{ html: string, changed: boolean }}
 */
export function injectHumzaWordCvTemplate(template, cvDocument, userProfile = {}) {
  const normalized = normalizeCvDocument(cvDocument);
  if (!normalized) {
    return { html: template, changed: false };
  }

  const data = enrichCvDocumentRichFields(normalized, userProfile);
  let html = injectHumzaWordCvTemplateRegex(template, data, userProfile);
  let changed = normalizeForCompare(html) !== normalizeForCompare(template);

  if (!changed) {
    const domHtml = injectHumzaWordCvTemplateDom(template, data, userProfile);
    if (normalizeForCompare(domHtml) !== normalizeForCompare(template)) {
      html = domHtml;
      changed = true;
    }
  }

  return { html, changed };
}
