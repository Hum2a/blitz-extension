import {
  normalizePromptParts,
  estimateOutputTokens,
} from "./prompt-parts.js";

const LINKEDIN_MAX_CHARS = 12000;

const CV_WRITING_PRINCIPLES = `
CV rules (tailoredCV + cvDocument — follow strictly):

Persona: senior technical recruiter, hiring manager, ATS optimiser, and CV writer. Completely tailor and optimise the CV for THIS role only.

Task: rewrite every section for max alignment with the job description. Inputs are Base CV (+ LinkedIn if provided) and job listing.

Requirements:
- Optimise for ATS parsing and human recruiters; mirror JD language, priorities, and terminology naturally.
- ONE A4 page maximum. Bullets over paragraphs; concise, high-density, skimmable plain text; no fluff or generic claims.
- Reorder content so the most relevant experience appears strongest; remove or compress irrelevant content aggressively.
- Every bullet passes the "so what?" test; strong action verbs; achievements, ownership, scalability, performance, reliability, business impact, technical decisions.
- Quantify impact where truthful (metrics, scale, %, users, revenue, automation, speed). Use proxy scale only when exact numbers are unavailable.
- Tailor summary and skills to the role; align projects and experience to JD technologies and responsibilities.
- Reframe transferable experience strategically when needed — believable and internally consistent. Sound like a credible candidate for THIS role, not a generic engineer. UK tech hiring standards.

Infer the best-fit role archetype from the JD and apply ONE emphasis:
- startup → ownership, speed, product thinking, breadth
- enterprise/corporate → scalability, stakeholder communication, reliability, governance, structured delivery
- frontend → UI/UX, performance, accessibility, responsiveness, modern frontend architecture
- backend → APIs, distributed systems, databases, scalability, observability, performance optimisation
- AI/ML → data pipelines, model integration, experimentation, inference performance, AI product delivery
- devops/platform → CI/CD, infrastructure automation, cloud architecture, monitoring, security, reliability engineering
- junior (candidate slightly underqualified) → transferable experience, fast learning, initiative, practical project depth

Cover letter (when enabled): 250–400 words; natural, confident, company- and role-specific; reference relevant experience, tech, and impact; avoid generic AI phrasing.

Do not fabricate employers, dates, roles, or metrics.
`;

function formatLinkedInSection(linkedinProfileText) {
  const text = linkedinProfileText?.trim();
  if (!text) return "";
  const truncated =
    text.length > LINKEDIN_MAX_CHARS
      ? `${text.slice(0, LINKEDIN_MAX_CHARS)}\n\n[LinkedIn profile truncated]`
      : text;
  return `

LinkedIn profile export (skills, experience, certifications; use mainly for screening answers and to enrich the tailored CV; do not invent details not present in Base CV or LinkedIn profile). IMPORTANT: Do NOT replace the Education section with contact/location/link lines from this export.
${truncated}`;
}

export function formatApplicationTitle(jobData, aiTitle) {
  if (aiTitle?.trim()) return aiTitle.trim().replace(/\u2014/g, " - ");
  const role = jobData?.jobTitle?.trim() || "Role";
  const company = jobData?.company?.trim() || "Company";
  return `${role} - ${company}`;
}

const HUMAN_PUNCTUATION_RULE = `
Human writing (all generated text: tailoredCV, coverLetter, screeningAnswers, summaries, bullets):
- Do NOT use the em dash (—) anywhere in candidate-facing copy.
- Prefer commas, periods, semicolons, or short separate sentences.
- For date ranges use a hyphen with spaces: "Jan 2020 - Present", not an em dash.
`;

export const GENERATION_LANGUAGES = {
  en: "English",
  de: "German",
  es: "Spanish",
  fr: "French",
};

function generationLanguageBlock(code) {
  if (!code || code === "en") return "";
  const label = GENERATION_LANGUAGES[code] || code;
  return `Write all candidate-facing text (tailoredCV, coverLetter, screeningAnswers, applicationTitle) in ${label}. Keep JSON property names in English.`;
}

export function buildSystemPrompt(profile, parts, options = {}) {
  const lang = options.generationLanguage || parts?.generationLanguage || "en";
  const blocks = [
    "You act as a senior technical recruiter, hiring manager, ATS optimiser, and CV writer. Tailor CVs and cover letters to specific job descriptions.",
    HUMAN_PUNCTUATION_RULE,
  ];

  const langBlock = generationLanguageBlock(lang);
  if (langBlock) blocks.push(langBlock);

  if (parts.includeCvPrinciples) {
    blocks.push(CV_WRITING_PRINCIPLES);
  }

  if (parts.includeSystemProfile) {
    blocks.push(`
User profile for screening questions:
- Name: ${profile.name || "Not set"}
- Right to work: ${profile.rightToWork || "Not set"}
- Notice period: ${profile.noticePeriod || "Not set"}
- Salary expectation: ${profile.salaryExpectation || "Not set"}
- Remote preference: ${profile.remotePreference || "Not set"}
- GitHub: ${profile.github || "Not set"}
- LinkedIn: ${profile.linkedin || "Not set"}
- Portfolio: ${profile.portfolio || "Not set"}
- Willing to relocate: ${profile.willingToRelocate ?? false}
- Skills and experience: ${JSON.stringify(profile.skills || {})}`);
  }

  blocks.push("\nAlways respond with valid JSON only. No markdown, no preamble.");
  return blocks.join("\n");
}

const HUMZA_CANONICAL_EDUCATION = `Education (canonical, must be used verbatim for Humza Butt):
- University of Portsmouth – 2019 – 2023
  - MEng Engineering in Computer Science (Hons) - Merit
  - (Including BSc Computer Science (Hons) – 1st Class)
- Wallington County Grammar School - 2017 – 2019
  - A-levels: Physics – A / Maths – A / Chemistry – C
- Wallington County Grammar School - 2012 – 2017
  - GCSE’S: 12A* - B’s`;

function isHumzaProfile(userProfile = {}) {
  const name = String(userProfile?.name || "").toLowerCase();
  const email = String(userProfile?.email || "").toLowerCase();
  const github = String(userProfile?.github || "").toLowerCase();
  const linkedin = String(userProfile?.linkedin || "").toLowerCase();
  return (
    name.includes("humza") ||
    email.includes("humzabutt1711") ||
    github.includes("hum2a") ||
    linkedin.includes("humza-butt")
  );
}

function buildResponseSchema(jobData, parts) {
  const titleHint = formatApplicationTitle(jobData);
  const coverLetterInstruction = parts.includeCoverLetter
    ? '"Tailored cover letter, 250–400 words, natural and specific to this company and role. Reference relevant experience, technologies, and impact. No generic AI phrasing."'
    : '"" (empty string, cover letter disabled)';

  const screeningBlock = parts.includeScreeningQuestions
    ? `"screeningAnswers": [
    { "question": "original question text", "answer": "honest answer based on user profile" }
  ],`
    : `"screeningAnswers": [],`;

  return `Generate a tailored application. All prose must follow the no-em-dash rule above. Respond with this exact JSON structure:
{
  "applicationTitle": "Short label for finding this later, format: {Job Title} - {Company Name} (e.g. ${JSON.stringify(titleHint.replace(/\u2014/g, " - "))})",
  "tailoredCV": "Full one-page tailored CV as plain text (same content as cvDocument). Sections: Professional Summary, Education, Technical Skills, Career. High-impact bullets only. ATS-friendly plain text.",
  "cvDocument": {
    "fullName": "string",
    "contactLine": "plain text fallback for contact row",
    "contactLineHtml": "HTML contact row with real links: location • phone • <a href='mailto:EMAIL'>email</a><br><a href='GITHUB_URL'>GitHub</a> | <a href='PORTFOLIO_URL'>Portfolio</a> | <a href='LINKEDIN_URL'>LinkedIn</a> (use URLs from user profile)",
    "summary": "2-4 sentences tailored to this role (plain)",
    "summaryHtml": "same summary as HTML <p>…</p>, may include <a href> only when relevant",
    "careerNote": "optional e.g. See Portfolio for more",
    "education": [{ "heading": "Institution – dates", "lines": ["degree lines"] }],
    "skillGroups": [{ "label": "Frontend", "value": "comma-separated skills" }],
    "jobs": [{
      "company": "string",
      "role": "job title",
      "dates": "Mon YYYY – Present",
      "location": "City",
      "bullets": ["Accomplished X by Y, resulting in Z"],
      "tech": "Tech: comma-separated stack"
    }]
  },
  "coverLetter": ${coverLetterInstruction},
  ${screeningBlock}
  "matchScore": <integer 0-100 representing how well the base CV matches this role>,
  "matchRationale": "Brief strategic tailoring summary: 3–5 concise bullets on what you changed in the CV/cover letter and why it improves fit for this role; end with one sentence on the match score"
}`;
}

/**
 * Build system + user prompts and per-part breakdown for cost estimates.
 */
export function buildApplicationPrompts({
  cvText = "",
  jobData = {},
  preferences = {},
  linkedinProfileText = "",
  userProfile = {},
}) {
  const parts = normalizePromptParts(preferences);
  const inputParts = [];
  const excludedParts = [];

  const systemPrompt = buildSystemPrompt(userProfile, parts, {
    generationLanguage: preferences.generationLanguage,
  });

  if (parts.includeBaseCv && cvText?.trim()) {
    inputParts.push({ key: "cv", label: "Base CV", text: `Base CV:\n${cvText.trim()}` });
  } else if (cvText?.trim()) {
    excludedParts.push("Base CV");
  }

  const linkedInBlock = formatLinkedInSection(
    parts.includeLinkedIn ? linkedinProfileText : ""
  );
  if (parts.includeLinkedIn && linkedInBlock.trim()) {
    inputParts.push({ key: "linkedin", label: "LinkedIn export", text: linkedInBlock.trim() });
  } else if (linkedinProfileText?.trim()) {
    excludedParts.push("LinkedIn export");
  }

  if (parts.includeJobDescription) {
    const jobBlock = [
      `Job Title: ${jobData.jobTitle || ""}`,
      `Company: ${jobData.company || ""}`,
      `Job Description:\n${jobData.jobDescription || ""}`,
    ].join("\n");
    inputParts.push({ key: "job", label: "Job listing", text: jobBlock });
  } else {
    excludedParts.push("Job listing");
  }

  if (parts.includeScreeningQuestions) {
    const questions =
      jobData.screeningQuestions?.length > 0
        ? jobData.screeningQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")
        : "None";
    inputParts.push({
      key: "screening",
      label: "Screening questions",
      text: `Screening questions (answer each honestly based on the user profile):\n${questions}`,
    });
  } else {
    excludedParts.push("Screening Q&A");
  }

  const tailoringNote = parts.includeCvPrinciples
    ? "Apply all CV rules above. Deliver: (1) one-page tailored CV, (2) tailored cover letter if enabled, (3) strategic changes in matchRationale."
    : "Completely tailor the CV to this job listing (one A4 page max). Explain strategic changes in matchRationale.";

  const bespokeConstraints = [];
  if (isHumzaProfile(userProfile)) {
    bespokeConstraints.push(HUMZA_CANONICAL_EDUCATION);
    bespokeConstraints.push(
      "Education rules (critical): The Education section in both tailoredCV and cvDocument.education MUST match the canonical entries above. Do not derive education from LinkedIn export, and never put contact/location/link lines under Education."
    );
  } else {
    bespokeConstraints.push(
      "Education rules: Prefer Education from Base CV. Only use LinkedIn education when Base CV does not contain education. Never put contact/location/link lines under Education."
    );
  }

  const userPrompt = [
    ...inputParts.map((p) => p.text),
    "",
    ...bespokeConstraints,
    "",
    `${tailoringNote} Do not fabricate experience, metrics, or employers. Do not use em dashes (—) in any field.`,
    "",
    buildResponseSchema(jobData, parts),
  ].join("\n");

  if (!parts.includeCoverLetter) excludedParts.push("Cover letter");

  return {
    parts,
    jobData,
    systemPrompt,
    userPrompt,
    inputParts,
    excludedParts,
    outputTokensEstimate: estimateOutputTokens(parts, jobData),
  };
}

export const PROMPTS = {
  system: (profile, preferences = {}) =>
    buildSystemPrompt(profile, normalizePromptParts(preferences)),

  generateApplication: (cvText, jobData, preferences, linkedinProfileText = "", userProfile = {}) =>
    buildApplicationPrompts({
      cvText,
      jobData,
      preferences,
      linkedinProfileText,
      userProfile,
    }).userPrompt,
};
