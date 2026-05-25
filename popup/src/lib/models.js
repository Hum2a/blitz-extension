/** Current Anthropic Sonnet default (see platform.claude.com/docs). */
export const ANTHROPIC_DEFAULT_MODEL = "claude-sonnet-4-6";

/** Retired / deprecated IDs → active replacement. */
export const RETIRED_ANTHROPIC_REMAP = {
  "claude-sonnet-4-20250514": ANTHROPIC_DEFAULT_MODEL,
  "claude-3-5-sonnet-20241022": ANTHROPIC_DEFAULT_MODEL,
  "claude-3-5-sonnet-20240620": ANTHROPIC_DEFAULT_MODEL,
  "claude-3-7-sonnet-20250219": ANTHROPIC_DEFAULT_MODEL,
  "claude-3-5-haiku-20241022": "claude-haiku-4-5-20251001",
  "claude-3-haiku-20240307": "claude-haiku-4-5-20251001",
};

export const ANTHROPIC_FALLBACK_CHAIN = [
  ANTHROPIC_DEFAULT_MODEL,
  "claude-sonnet-4-5-20250929",
  "claude-haiku-4-5-20251001",
];

export const OPENAI_DEFAULT_MODEL = "gpt-4o";

export const ANTHROPIC_MODEL_SUGGESTIONS = [
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (recommended)" },
  { id: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5" },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (faster, cheaper)" },
  { id: "claude-opus-4-6", label: "Claude Opus 4.6 (highest quality)" },
];

export const OPENAI_MODEL_SUGGESTIONS = [
  { id: "gpt-4o", label: "GPT-4o (recommended)" },
  { id: "gpt-4o-mini", label: "GPT-4o mini (cheaper)" },
];

export function remapAnthropicModel(model) {
  const trimmed = model?.trim();
  if (!trimmed) return ANTHROPIC_DEFAULT_MODEL;
  return RETIRED_ANTHROPIC_REMAP[trimmed] || trimmed;
}

export function uniqueModels(models) {
  const seen = new Set();
  return models.filter((m) => {
    if (!m || seen.has(m)) return false;
    seen.add(m);
    return true;
  });
}

export async function fetchAnthropicModels(apiKey) {
  if (!apiKey?.trim()) return null;
  try {
    const response = await fetch("https://api.anthropic.com/v1/models?limit=50", {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return (data.data || [])
      .filter((m) => m.type === "model" && m.id)
      .map((m) => ({
        id: m.id,
        label: m.display_name ? `${m.display_name} (${m.id})` : m.id,
      }));
  } catch {
    return null;
  }
}

export function isModelErrorMessage(message) {
  return (
    /^model:/i.test(message || "") ||
    /model.*not found|invalid.*model|does not exist|deprecated|retired/i.test(message || "")
  );
}
