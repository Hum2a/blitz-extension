import { PROMPTS } from "./prompts.js";
import { getAllSettings, getStorage } from "./storage.js";

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

export function estimateCostFromPrompts({
  provider,
  model,
  systemPrompt,
  userPrompt,
  outputTokensEstimate = 6500,
}) {
  const pricing = getModelPricing(provider, model);
  const systemTokens = estimateTokens(systemPrompt);
  const userTokens = estimateTokens(userPrompt);
  const inputTokens = systemTokens + userTokens;
  const inputCostUsd = (inputTokens / 1_000_000) * pricing.input;
  const outputCostUsd = (outputTokensEstimate / 1_000_000) * pricing.output;
  const totalCostUsd = inputCostUsd + outputCostUsd;

  return {
    provider,
    model: model || "(default)",
    inputTokens,
    outputTokens: outputTokensEstimate,
    outputTokensEstimate,
    systemTokens,
    userTokens,
    inputCostUsd,
    outputCostUsd,
    totalCostUsd,
    isEstimate: true,
    breakdown: [
      { label: "System prompt", tokens: systemTokens, costUsd: (systemTokens / 1_000_000) * pricing.input },
      { label: "Job + CV + profile", tokens: userTokens, costUsd: (userTokens / 1_000_000) * pricing.input },
      {
        label: "Generated application (est.)",
        tokens: outputTokensEstimate,
        costUsd: outputCostUsd,
      },
    ],
  };
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

  const systemPrompt = PROMPTS.system(settings.user_profile || {});
  const userPrompt = PROMPTS.generateApplication(
    settings.cv_text,
    job,
    settings.preferences || {},
    settings.linkedin_profile_text
  );

  return estimateCostFromPrompts({ provider, model, systemPrompt, userPrompt });
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
