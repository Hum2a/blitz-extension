import { estimateTokens } from "./cost-estimate.js";

/** Weights must sum to 100 */
export const GENERATION_STAGES = [
  { id: "validate", label: "Validate job listing", weight: 8 },
  { id: "settings", label: "Load CV & profile", weight: 10 },
  { id: "license", label: "Check application quota", weight: 6 },
  { id: "prompts", label: "Build tailored prompts", weight: 14 },
  { id: "model", label: "Resolve AI model", weight: 6 },
  { id: "api", label: "Generate with AI", weight: 44 },
  { id: "parse", label: "Parse application JSON", weight: 7 },
  { id: "save", label: "Prepare for review", weight: 5 },
];

const TOTAL_WEIGHT = GENERATION_STAGES.reduce((n, s) => n + s.weight, 0);

export function progressFromStage(stageId, detail = "", subDetail = "") {
  const idx = GENERATION_STAGES.findIndex((s) => s.id === stageId);
  const safeIdx = idx < 0 ? 0 : idx;

  let completedWeight = 0;
  for (let i = 0; i < safeIdx; i++) {
    completedWeight += GENERATION_STAGES[i].weight;
  }

  const current = GENERATION_STAGES[safeIdx];
  const percent = Math.min(
    99,
    Math.round((completedWeight / TOTAL_WEIGHT) * 100)
  );

  const steps = GENERATION_STAGES.map((s, i) => ({
    id: s.id,
    label: s.label,
    status: i < safeIdx ? "done" : i === safeIdx ? "active" : "pending",
    detail: i === safeIdx ? detail : undefined,
    subDetail: i === safeIdx ? subDetail : undefined,
  }));

  return {
    stageId,
    stageLabel: current?.label || stageId,
    detail,
    subDetail,
    percent,
    steps,
    isComplete: false,
  };
}

export function progressComplete(detail = "Ready to review") {
  const steps = GENERATION_STAGES.map((s) => ({
    id: s.id,
    label: s.label,
    status: "done",
  }));
  return {
    stageId: "save",
    stageLabel: "Complete",
    detail,
    subDetail: "",
    percent: 100,
    steps,
    isComplete: true,
  };
}

export function createProgressReporter() {
  return (stageId, detail = "", subDetail = "") => {
    const payload = progressFromStage(stageId, detail, subDetail);
    chrome.runtime.sendMessage({ type: "GENERATION_PROGRESS", payload }).catch(() => {});
    return payload;
  };
}

export function formatPromptStats({ cvText, linkedinText, jobData, systemPrompt, userPrompt }) {
  const cvTokens = estimateTokens(cvText);
  const linkedinTokens = estimateTokens(linkedinText);
  const jobTokens = estimateTokens(jobData?.jobDescription || "");
  const systemTokens = estimateTokens(systemPrompt);
  const userTokens = estimateTokens(userPrompt);
  const inputTotal = systemTokens + userTokens;
  return {
    cvTokens,
    linkedinTokens,
    jobTokens,
    systemTokens,
    userTokens,
    inputTotal,
    summary: `~${inputTotal.toLocaleString()} input tokens · CV ${cvTokens.toLocaleString()} · job ${jobTokens.toLocaleString()}${linkedinTokens ? ` · LinkedIn ${linkedinTokens.toLocaleString()}` : ""}`,
  };
}
