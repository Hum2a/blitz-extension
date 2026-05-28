import { buildApplicationPrompts, buildSystemPrompt } from "./prompts.js";
import { estimateOutputTokens } from "./prompt-parts.js";
import { getAllSettings, getStorage } from "./storage.js";

const INPUT_PART_KEYS = {
  includeBaseCv: "cv",
  includeLinkedIn: "linkedin",
  includeJobDescription: "job",
  includeScreeningQuestions: "screening",
};

/** Rough token count (~4 chars per token for English). */
export function estimateTokens(text) {
  return Math.ceil((text || "").length / 4);
}

/** USD per 1M tokens — update periodically; estimates only. */
const PRICING_USD_PER_M = {
  anthropic: {
    "claude-sonnet-4-6": { input: 3, output: 15 },
    "claude-sonnet-4-5-20250929": { input: 3, output: 15 },
    "claude-haiku-4-5-20251001": { input: 1, output: 5 },
    "claude-opus-4-6": { input: 5, output: 25 },
    default: { input: 3, output: 15 },
  },
  openai: {
    "gpt-4o": { input: 2.5, output: 10 },
    "gpt-4o-mini": { input: 0.15, output: 0.6 },
    "gpt-4-turbo": { input: 10, output: 30 },
    default: { input: 2.5, output: 10 },
  },
  google: {
    "gemini-2.0-flash": { input: 0.1, output: 0.4 },
    "gemini-1.5-pro": { input: 1.25, output: 5 },
    "gemini-1.5-flash": { input: 0.075, output: 0.3 },
    default: { input: 0.1, output: 0.4 },
  },
  openrouter: {
    default: { input: 2, output: 8 },
  },
};

export function getModelPricing(provider, model) {
  const table = PRICING_USD_PER_M[provider] || PRICING_USD_PER_M.anthropic;
  return table[model] || table.default;
}

export function costFromUsage(usage, provider, model) {
  if (!usage) return null;
  const pricing = getModelPricing(provider, model);
  const inputTokens = usage.input_tokens ?? usage.prompt_tokens ?? 0;
  const outputTokens = usage.output_tokens ?? usage.completion_tokens ?? 0;
  const inputCostUsd = (inputTokens / 1_000_000) * pricing.input;
  const outputCostUsd = (outputTokens / 1_000_000) * pricing.output;
  return {
    inputTokens,
    outputTokens,
    inputCostUsd,
    outputCostUsd,
    totalCostUsd: inputCostUsd + outputCostUsd,
    provider,
    model,
    isEstimate: false,
  };
}

/**
 * Per-toggle USD/token contribution for prompt part settings UI.
 */
export function computePromptPartCosts(bundle, userProfile = {}, { provider, model } = {}) {
  const pricing = getModelPricing(provider, model);
  const inputRate = pricing.input / 1_000_000;
  const outputRate = pricing.output / 1_000_000;
  const parts = bundle.parts || {};
  const jobData = bundle.jobData || {};
  const costs = {};

  const baseSystemTokens = estimateTokens(
    buildSystemPrompt(userProfile, {
      includeCvPrinciples: false,
      includeSystemProfile: false,
    })
  );

  const principlesTokens = estimateTokens(
    buildSystemPrompt(userProfile, {
      includeCvPrinciples: true,
      includeSystemProfile: false,
    })
  );
  const profileTokens = estimateTokens(
    buildSystemPrompt(userProfile, {
      includeCvPrinciples: false,
      includeSystemProfile: true,
    })
  );

  const principlesDelta = Math.max(0, principlesTokens - baseSystemTokens);
  const profileDelta = Math.max(0, profileTokens - baseSystemTokens);

  costs.includeCvPrinciples = parts.includeCvPrinciples
    ? { tokens: principlesDelta, costUsd: principlesDelta * inputRate, kind: "input" }
    : { tokens: 0, costUsd: 0, kind: "input" };

  costs.includeSystemProfile = parts.includeSystemProfile
    ? { tokens: profileDelta, costUsd: profileDelta * inputRate, kind: "input" }
    : { tokens: 0, costUsd: 0, kind: "input" };

  for (const [prefKey, partKey] of Object.entries(INPUT_PART_KEYS)) {
    const part = bundle.inputParts?.find((p) => p.key === partKey);
    if (part && parts[prefKey]) {
      const tokens = estimateTokens(part.text);
      costs[prefKey] = { tokens, costUsd: tokens * inputRate, kind: "input" };
    } else {
      costs[prefKey] = { tokens: 0, costUsd: 0, kind: "input" };
    }
  }

  const outputBase = estimateOutputTokens(
    { ...parts, includeCoverLetter: false, includeScreeningQuestions: false },
    jobData
  );
  const outputWithCover = estimateOutputTokens(
    { ...parts, includeCoverLetter: true, includeScreeningQuestions: false },
    jobData
  );
  const coverDelta = Math.max(0, outputWithCover - outputBase);
  costs.includeCoverLetter = parts.includeCoverLetter
    ? { tokens: coverDelta, costUsd: coverDelta * outputRate, kind: "output" }
    : { tokens: 0, costUsd: 0, kind: "output" };

  const screeningInput = costs.includeScreeningQuestions?.tokens || 0;
  const screeningInputUsd = costs.includeScreeningQuestions?.costUsd || 0;
  const outputWithScreen = estimateOutputTokens(
    { ...parts, includeScreeningQuestions: true },
    jobData
  );
  const outputWithoutScreen = estimateOutputTokens(
    { ...parts, includeScreeningQuestions: false },
    jobData
  );
  const screenOutDelta = Math.max(0, outputWithScreen - outputWithoutScreen);
  if (parts.includeScreeningQuestions) {
    costs.includeScreeningQuestions = {
      tokens: screeningInput + screenOutDelta,
      costUsd: screeningInputUsd + screenOutDelta * outputRate,
      kind: "mixed",
    };
  }

  return costs;
}

export function estimateCostFromPromptBundle(bundle, { provider, model }, userProfile = {}) {
  const pricing = getModelPricing(provider, model);
  const systemTokens = estimateTokens(bundle.systemPrompt);
  const inputPartTokens = bundle.inputParts.reduce(
    (sum, part) => sum + estimateTokens(part.text),
    0
  );
  const inputTokens = systemTokens + inputPartTokens;
  const outputTokensEstimate = bundle.outputTokensEstimate;

  const inputCostUsd = (inputTokens / 1_000_000) * pricing.input;
  const outputCostUsd = (outputTokensEstimate / 1_000_000) * pricing.output;
  const totalCostUsd = inputCostUsd + outputCostUsd;

  const breakdown = [
    {
      label: "System prompt",
      tokens: systemTokens,
      costUsd: (systemTokens / 1_000_000) * pricing.input,
    },
    ...bundle.inputParts.map((part) => ({
      label: part.label,
      tokens: estimateTokens(part.text),
      costUsd: (estimateTokens(part.text) / 1_000_000) * pricing.input,
    })),
    {
      label: "Generated application (est.)",
      tokens: outputTokensEstimate,
      costUsd: outputCostUsd,
    },
  ];

  const partCosts = computePromptPartCosts(bundle, userProfile, { provider, model });

  return {
    provider,
    model: model || "(default)",
    inputTokens,
    outputTokens: outputTokensEstimate,
    outputTokensEstimate,
    systemTokens,
    userTokens: inputPartTokens,
    inputCostUsd,
    outputCostUsd,
    totalCostUsd,
    isEstimate: true,
    breakdown,
    excludedParts: bundle.excludedParts,
    partCosts,
  };
}

/** @deprecated Use estimateCostFromPromptBundle */
export function estimateCostFromPrompts({
  provider,
  model,
  systemPrompt,
  userPrompt,
  outputTokensEstimate = 6500,
}) {
  return estimateCostFromPromptBundle(
    {
      systemPrompt,
      userPrompt,
      inputParts: [{ key: "user", label: "Job + CV + profile", text: userPrompt }],
      outputTokensEstimate,
      excludedParts: [],
    },
    { provider, model }
  );
}

export async function estimateCurrentApplicationCost() {
  const settings = await getAllSettings();
  const job = await getStorage("pending_job");
  const { provider, model, apiKey } = settings.ai_config || {};

  if (!apiKey?.trim()) {
    return { error: "Add your API key in Settings to see cost estimates." };
  }
  if (!settings.cv_text?.trim()) {
    return { error: "Add your CV in Settings to see cost estimates." };
  }
  if (!job?.jobTitle && !job?.jobDescription) {
    return { error: "Detect a job on this page first." };
  }

  const bundle = buildApplicationPrompts({
    cvText: settings.cv_text,
    jobData: job,
    preferences: settings.preferences || {},
    linkedinProfileText: settings.linkedin_profile_text,
    userProfile: settings.user_profile || {},
  });

  return estimateCostFromPromptBundle(
    bundle,
    { provider, model },
    settings.user_profile || {}
  );
}

export function formatUsd(amount) {
  if (amount == null || Number.isNaN(amount)) return "—";
  if (amount < 0.01) return `<$0.01`;
  if (amount < 1) return `$${amount.toFixed(3)}`;
  return `$${amount.toFixed(2)}`;
}

export function formatTokens(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
