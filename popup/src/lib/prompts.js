const LINKEDIN_MAX_CHARS = 12000;

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

export const PROMPTS = {
  system: (profile) => `
You are an expert career coach and CV writer. You help job seekers tailor their CVs and cover letters to specific job descriptions.

User profile for screening questions:
- Name: ${profile.name || "Not set"}
- Right to work: ${profile.rightToWork || "Not set"}
- Notice period: ${profile.noticePeriod || "Not set"}
- Salary expectation: ${profile.salaryExpectation || "Not set"}
- Remote preference: ${profile.remotePreference || "Not set"}
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

    return `
Base CV:
${cvText}${formatLinkedInSection(linkedinProfileText)}

Job Title: ${jobData.jobTitle}
Company: ${jobData.company}
Job Description:
${jobData.jobDescription}

Screening questions (answer each honestly based on the user profile):
${questions}

Generate a tailored application. Respond with this exact JSON structure:
{
  "tailoredCV": "Full tailored CV as plain text, optimised for this specific role. Reorder skills section to prioritise relevant technologies. Rewrite summary/objective to mirror the job description tone. Adjust bullet points to emphasise most relevant experience. Do not fabricate experience.",
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
