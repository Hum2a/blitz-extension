import {
  normalizePromptParts,
  estimateOutputTokens,
} from "./prompt-parts.js";

const LINKEDIN_MAX_CHARS = 12000;

const CV_WRITING_PRINCIPLES = `
CV writing rules (follow strictly when producing tailoredCV):

Core Principles:
- Write for impact, clarity, and relevance, not completeness.
- Optimise for ATS + human skim readers.
- Prefer outcomes over responsibilities.
- Every line should answer: "Why does this matter?"

Structure & Length:
- Keep CV to 1–2 pages max.
- Use clear sections: Summary, Experience, Projects, Education, Skills.
- Prioritise recent and relevant experience.
- Remove or compress unrelated roles unless they show leadership or scale.

Bullet Point Formula:
- Use this structure wherever possible: Accomplished X by doing Y, resulting in Z
- Examples:
  - Reduced API latency by 40% by introducing edge caching and query batching.
  - Built a mentor-matching algorithm using weighted scoring, increasing successful matches by 3x

Metrics & Evidence:
- Quantify impact wherever possible: users, sessions, load time, revenue, scale, adoption, accuracy, cost reduction.
- If exact numbers are not available, use directional or proxy metrics (e.g. "sub-second load times", "multi-tenant", "enterprise-scale").

Technical Detail:
- Mention technologies only where they add signal.
- Prefer how and why tools were used, not tool dumping.
- Show system thinking: architecture, trade-offs, performance, reliability, security, scalability.

Language & Tone:
- Use strong action verbs: built, shipped, architected, optimised, led.
- Avoid filler phrases: responsible for, worked on, helped with.
- Be confident but factual. No hype, no buzzword soup.
- Never use the em dash character (—). Use commas, full stops, colons, or parentheses instead. Date ranges may use a simple hyphen (e.g. Jan 2020 - Present).

Role Tailoring:
- Mirror the job description language and priorities.
- Reorder bullets to surface the most relevant skills first.
- Adjust emphasis:
  - Product roles → outcomes & users
  - Infra roles → reliability, scale, automation
  - Startup roles → ownership & breadth

What to Cut:
- Long narratives.
- Obvious skills without context.
- Repetition across roles.
- Early or junior experience that no longer differentiates the candidate.

Final Checks:
- Every bullet passes the "so what?" test.
- CV can be skimmed in 30 seconds and still tell a clear story.
- Formatting is clean, consistent, and readable in plain text.
`;

function formatLinkedInSection(linkedinProfileText) {
  const text = linkedinProfileText?.trim();
  if (!text) return "";
  const truncated =
    text.length > LINKEDIN_MAX_CHARS
      ? `${text.slice(0, LINKEDIN_MAX_CHARS)}\n\n[LinkedIn profile truncated]`
      : text;
  return `

LinkedIn profile export (skills, experience, education, certifications; use for screening answers and to enrich the tailored CV; do not invent details not present in Base CV or LinkedIn profile):
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

function buildSystemPrompt(profile, parts) {
  const blocks = [
    "You are an expert career coach and CV writer. You help job seekers tailor CVs and cover letters to specific job descriptions.",
    HUMAN_PUNCTUATION_RULE,
  ];

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

function buildResponseSchema(jobData, parts) {
  const titleHint = formatApplicationTitle(jobData);
  const coverLetterInstruction = parts.includeCoverLetter
    ? '"Professional cover letter, 3 paragraphs, specific to this role and company. Do not use generic filler phrases."'
    : '"" (empty string, cover letter disabled)';

  const screeningBlock = parts.includeScreeningQuestions
    ? `"screeningAnswers": [
    { "question": "original question text", "answer": "honest answer based on user profile" }
  ],`
    : `"screeningAnswers": [],`;

  return `Generate a tailored application. All prose must follow the no-em-dash rule above. Respond with this exact JSON structure:
{
  "applicationTitle": "Short label for finding this later, format: {Job Title} - {Company Name} (e.g. ${JSON.stringify(titleHint.replace(/\u2014/g, " - "))})",
  "tailoredCV": "Full tailored CV as plain text (same content as cvDocument). Sections: Professional Summary, Education, Technical Skills, Career. Use accomplishment bullets. ATS-friendly plain text.",
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
  "matchRationale": "2 sentence explanation of the match score"
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

  const systemPrompt = buildSystemPrompt(userProfile, parts);

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
    ? "Apply all CV writing rules above when tailoring."
    : "Tailor the CV to the job listing.";

  const userPrompt = [
    ...inputParts.map((p) => p.text),
    "",
    `${tailoringNote} Do not fabricate experience, metrics, or employers. Do not use em dashes (—) in any field.`,
    "",
    buildResponseSchema(jobData, parts),
  ].join("\n");

  if (!parts.includeCoverLetter) excludedParts.push("Cover letter");

  return {
    parts,
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
