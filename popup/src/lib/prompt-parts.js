export const DEFAULT_PROMPT_PARTS = {
  includeCvPrinciples: true,
  includeSystemProfile: true,
  includeBaseCv: true,
  includeLinkedIn: true,
  includeJobDescription: true,
  includeScreeningQuestions: true,
  includeCoverLetter: true,
};

export const PROMPT_PART_OPTIONS = [
  {
    key: "includeCvPrinciples",
    label: "CV writing rules",
    hint: "System prompt — quality guidelines",
    group: "System",
  },
  {
    key: "includeSystemProfile",
    label: "Profile for screening",
    hint: "System prompt — name, work auth, skills",
    group: "System",
  },
  {
    key: "includeBaseCv",
    label: "Base CV",
    hint: "Your CV text — largest input cost",
    group: "Input",
  },
  {
    key: "includeLinkedIn",
    label: "LinkedIn export",
    hint: "LinkedIn PDF text from Settings",
    group: "Input",
  },
  {
    key: "includeJobDescription",
    label: "Job listing",
    hint: "Title, company, and description",
    group: "Input",
  },
  {
    key: "includeScreeningQuestions",
    label: "Screening Q&A",
    hint: "Form questions + generated answers",
    group: "Input & output",
  },
  {
    key: "includeCoverLetter",
    label: "Cover letter",
    hint: "Output — ~1.2k tokens when on",
    group: "Output",
  },
];

export function normalizePromptParts(preferences = {}) {
  const raw = preferences.promptParts || {};
  const coverNever = preferences.coverLetterMode === "never";
  return {
    ...DEFAULT_PROMPT_PARTS,
    ...raw,
    includeCoverLetter: coverNever
      ? false
      : raw.includeCoverLetter !== false,
  };
}

export function estimateOutputTokens(parts, jobData = {}) {
  let tokens = 4200;
  if (parts.includeCoverLetter) tokens += 1200;
  if (parts.includeScreeningQuestions) {
    tokens += (jobData.screeningQuestions?.length || 0) * 180;
  } else {
    tokens -= 400;
  }
  if (!parts.includeBaseCv) tokens -= 800;
  return Math.max(1800, Math.round(tokens));
}
