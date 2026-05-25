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

LinkedIn profile export (skills, experience, education, certifications — use for screening answers and to enrich the tailored CV; do not invent details not present in Base CV or LinkedIn profile):
${truncated}`;
}

export function formatApplicationTitle(jobData, aiTitle) {
  if (aiTitle?.trim()) return aiTitle.trim();
  const role = jobData?.jobTitle?.trim() || "Role";
  const company = jobData?.company?.trim() || "Company";
  return `${role} — ${company}`;
}

export const PROMPTS = {
  system: (profile) => `
You are an expert career coach and CV writer. You help job seekers tailor CVs and cover letters to specific job descriptions.

${CV_WRITING_PRINCIPLES}

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
- Skills and experience: ${JSON.stringify(profile.skills || {})}

Always respond with valid JSON only. No markdown, no preamble.
`,

  generateApplication: (cvText, jobData, preferences, linkedinProfileText = "") => {
    const coverLetterInstruction =
      preferences.coverLetterMode === "never"
        ? '"" (empty string, not required)'
        : '"Professional cover letter, 3 paragraphs, specific to this role and company. Do not use generic filler phrases."';

    const questions =
      jobData.screeningQuestions?.length > 0
        ? jobData.screeningQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")
        : "None";

    const titleHint = formatApplicationTitle(jobData);

    return `
Base CV:
${cvText}${formatLinkedInSection(linkedinProfileText)}

Job Title: ${jobData.jobTitle}
Company: ${jobData.company}
Job Description:
${jobData.jobDescription}

Screening questions (answer each honestly based on the user profile):
${questions}

Apply all CV writing rules above when tailoring. Do not fabricate experience, metrics, or employers.

Generate a tailored application. Respond with this exact JSON structure:
{
  "applicationTitle": "Short label for finding this later — use format: {Job Title} — {Company Name} (e.g. ${JSON.stringify(titleHint)})",
  "tailoredCV": "Full tailored CV as plain text (same content as cvDocument). Sections: Professional Summary, Education, Technical Skills, Career. Use accomplishment bullets. ATS-friendly plain text.",
  "cvDocument": {
    "fullName": "string",
    "contactLine": "location • phone • email | GitHub | Portfolio | LinkedIn",
    "summary": "2-4 sentences tailored to this role",
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
  "screeningAnswers": [
    { "question": "original question text", "answer": "honest answer based on user profile" }
  ],
  "matchScore": <integer 0-100 representing how well the base CV matches this role>,
  "matchRationale": "2 sentence explanation of the match score"
}
`;
  },
};
