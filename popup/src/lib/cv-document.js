/**
 * Build / parse structured CV data for HTML templates.
 */

import {
  buildContactLineHtml,
  enrichCvDocumentRichFields,
} from "./cv-html.js";

export { buildContactLineHtml };

const SECTION_HEADERS = [
  "professional summary",
  "summary",
  "education",
  "technical skills",
  "skills",
  "career",
  "experience",
  "work experience",
];

function buildContactLineInline(profile) {
  const parts = [];
  if (profile?.location?.trim()) parts.push(profile.location.trim());
  if (profile?.phone?.trim()) parts.push(profile.phone.trim());
  if (profile?.email?.trim()) parts.push(profile.email.trim());
  const linkLabels = [];
  if (profile?.github?.trim()) linkLabels.push("GitHub");
  if (profile?.portfolio?.trim()) linkLabels.push("Portfolio");
  if (profile?.linkedin?.trim()) linkLabels.push("LinkedIn");
  if (linkLabels.length) parts.push(linkLabels.join(" | "));
  return parts.join(" • ");
}

function mergeParsedTailoredCv(base, parsed) {
  if (!parsed) return base;
  const out = { ...base };
  if (parsed.summary?.trim()) {
    out.summary = parsed.summary;
    out.summaryHtml = undefined;
  }
  if (parsed.careerNote?.trim()) {
    out.careerNote = parsed.careerNote;
    out.careerNoteHtml = undefined;
  }
  if (parsed.skillGroups?.length) out.skillGroups = parsed.skillGroups;
  if (parsed.jobs?.length) out.jobs = parsed.jobs;
  if (parsed.education?.length) out.education = parsed.education;
  if (parsed.fullName?.trim()) out.fullName = parsed.fullName;
  if (parsed.contactLine?.trim()) {
    out.contactLine = parsed.contactLine;
    out.contactLineHtml = undefined;
  }
  return out;
}

/** Prefer structured cvDocument; overlay sections from tailored plain text when present. */
export function resolveCvDocument({ cvDocument, tailoredCV, userProfile }) {
  let doc = null;
  if (cvDocument && typeof cvDocument === "object") {
    doc = { ...cvDocument };
  }
  if (tailoredCV?.trim()) {
    const parsed = parseTailoredCvText(tailoredCV, userProfile);
    doc = doc ? mergeParsedTailoredCv(doc, parsed) : parsed;
  }
  if (!doc) return null;

  if (!doc.fullName?.trim() && userProfile?.name) doc.fullName = userProfile.name;
  if (!doc.contactLine?.trim()) doc.contactLine = buildContactLineInline(userProfile);

  return enrichCvDocumentRichFields(doc, userProfile);
}

export function parseTailoredCvText(text, userProfile = {}) {
  const lines = text.split(/\r?\n/).map((l) => l.trimEnd());
  const nonEmpty = lines.filter((l) => l.trim());

  let fullName = userProfile?.name?.trim() || "";
  let contactLine = buildContactLineInline(userProfile);
  let summary = "";
  let careerNote = "";
  const education = [];
  const skillGroups = [];
  const jobs = [];

  if (!fullName && nonEmpty[0] && !looksLikeSection(nonEmpty[0])) {
    fullName = nonEmpty[0].trim();
  }

  let section = "header";
  let currentJob = null;
  let eduBlock = null;

  const flushJob = () => {
    if (currentJob) {
      jobs.push(currentJob);
      currentJob = null;
    }
  };

  const flushEdu = () => {
    if (eduBlock) {
      education.push(eduBlock);
      eduBlock = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const sectionKey = matchSection(line);
    if (sectionKey) {
      flushJob();
      flushEdu();
      section = sectionKey;
      if (sectionKey === "career" && line.toLowerCase().includes("portfolio")) {
        careerNote = line;
      }
      continue;
    }

    if (section === "header" || section === "summary") {
      if (!summary && section === "summary") {
        summary = line;
      } else if (section === "header" && !fullName && !line.includes("|")) {
        if (line.includes("@") || line.includes("•") || /\d{5,}/.test(line)) {
          contactLine = contactLine || line.replace(/\s*•\s*/g, " • ");
        } else if (!looksLikeSection(line)) {
          fullName = fullName || line;
        }
      } else if (section === "summary") {
        summary += (summary ? " " : "") + line;
      } else if (line.includes("@") || line.includes("•")) {
        contactLine = line.replace(/\s*•\s*/g, " • ");
      }
      continue;
    }

    if (section === "education") {
      if (!eduBlock || isEduHeading(line)) {
        flushEdu();
        eduBlock = { heading: line, lines: [] };
      } else {
        eduBlock.lines.push(line);
      }
      continue;
    }

    if (section === "skills") {
      const skillMatch = line.match(/^([^:]+):\s*(.+)$/);
      if (skillMatch) {
        skillGroups.push({ label: skillMatch[1].trim(), value: skillMatch[2].trim() });
      } else {
        skillGroups.push({ label: "Skills", value: line });
      }
      continue;
    }

    if (section === "career" || section === "experience") {
      if (line.toLowerCase().startsWith("tech:")) {
        if (currentJob) currentJob.tech = line.replace(/^tech:\s*/i, "").trim();
        continue;
      }
      if (isJobLine(line)) {
        flushJob();
        currentJob = parseJobLine(line);
        continue;
      }
      if (/^[•\-–—]\s*/.test(line) || line.startsWith("* ")) {
        if (!currentJob) currentJob = { company: "", role: "", dates: "", location: "", bullets: [], tech: "" };
        currentJob.bullets.push(line.replace(/^[•\-–—*]\s*/, "").trim());
        continue;
      }
      if (currentJob && careerNote === "" && line.toLowerCase().includes("portfolio")) {
        careerNote = line;
      }
    }
  }

  flushJob();
  flushEdu();

  if (!summary) {
    const summaryIdx = nonEmpty.findIndex((l) => matchSection(l) === "summary");
    if (summaryIdx >= 0) {
      const chunk = [];
      for (let j = summaryIdx + 1; j < nonEmpty.length; j++) {
        if (matchSection(nonEmpty[j])) break;
        chunk.push(nonEmpty[j]);
      }
      summary = chunk.join(" ");
    }
  }

  return {
    fullName: fullName || "Curriculum Vitae",
    contactLine,
    summary,
    careerNote,
    education,
    skillGroups,
    jobs,
  };
}

function looksLikeSection(line) {
  return Boolean(matchSection(line));
}

function matchSection(line) {
  const lower = line.toLowerCase().replace(/[^a-z ]/g, "").trim();
  if (lower === "professional summary" || lower === "summary") return "summary";
  if (lower === "education") return "education";
  if (lower === "technical skills" || lower === "skills") return "skills";
  if (lower === "career" || lower === "work experience" || lower === "experience") return "career";
  return null;
}

function isEduHeading(line) {
  return /\d{4}/.test(line) && (line.includes("–") || line.includes("-") || line.includes("University") || line.includes("School"));
}

function isJobLine(line) {
  const pipes = (line.match(/\|/g) || []).length;
  return pipes >= 2 || (pipes >= 1 && /\b(19|20)\d{2}\b/.test(line));
}

function parseJobLine(line) {
  const parts = line.split("|").map((p) => p.trim());
  if (parts.length >= 3) {
    return {
      company: parts[0],
      role: parts[1].replace(/\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4}).*$/i, "").trim() || parts[1],
      dates: extractDates(parts[1] + " " + parts.slice(1).join(" ")),
      location: parts[2],
      bullets: [],
      tech: "",
    };
  }
  return {
    company: parts[0] || line,
    role: parts[1] || "",
    dates: "",
    location: parts[2] || "",
    bullets: [],
    tech: "",
  };
}

function extractDates(str) {
  const m = str.match(
    /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}\s*[–—-]\s*(?:Present|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{4}))/i
  );
  if (m) return m[1];
  const y = str.match(/\d{4}\s*[–—-]\s*(?:Present|\d{4})/i);
  return y ? y[0] : "";
}
