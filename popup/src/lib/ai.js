import {
  remapAnthropicModel,
  ANTHROPIC_DEFAULT_MODEL,
  ANTHROPIC_FALLBACK_CHAIN,
  OPENAI_DEFAULT_MODEL,
  uniqueModels,
  isModelErrorMessage,
} from "./models.js";

export function resolveModel(provider, model) {
  if (provider === "anthropic") {
    return remapAnthropicModel(model);
  }
  const trimmed = model?.trim();
  if (trimmed) return trimmed;
  return OPENAI_DEFAULT_MODEL;
}

export function formatApiError(errBody, status, provider) {
  const msg = errBody?.error?.message || errBody?.message || "";
  if (isModelErrorMessage(msg)) {
    const modelName = msg.replace(/^model:\s*/i, "").trim();
    return (
      `Invalid or unavailable model${modelName ? ` (“${modelName}”)` : ""}. ` +
      `Open Settings → AI provider, click “Refresh models”, and pick one from your account ` +
      `(recommended: ${ANTHROPIC_DEFAULT_MODEL} or gpt-4o).`
    );
  }
  if (status === 401) return "Invalid API key. Check Settings → AI provider.";
  if (status === 429) return "Rate limited — wait a moment and try again.";
  return msg || `${provider} API error (${status})`;
}

export async function callAI({
  provider,
  apiKey,
  model,
  systemPrompt,
  userPrompt,
  onApiProgress,
}) {
  if (!apiKey) {
    throw new Error("API key not configured. Add your key in Settings.");
  }

  if (provider === "anthropic") {
    return callAnthropicWithFallback({
      apiKey,
      model,
      systemPrompt,
      userPrompt,
      onApiProgress,
    });
  }
  if (provider === "openai") {
    onApiProgress?.(resolveModel("openai", model), 1, 1);
    return callOpenAI({ apiKey, model, systemPrompt, userPrompt });
  }
  throw new Error(`Unknown AI provider: ${provider}`);
}

async function requestAnthropic({ apiKey, model, systemPrompt, userPrompt }) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const error = new Error(formatApiError(err, response.status, "Anthropic"));
    error.isModelError = isModelErrorMessage(err.error?.message || "");
    throw error;
  }

  const data = await response.json();
  return {
    text: data.content?.[0]?.text || "",
    usage: data.usage,
    model: data.model,
  };
}

async function callAnthropicWithFallback({
  apiKey,
  model,
  systemPrompt,
  userPrompt,
  onApiProgress,
}) {
  const candidates = uniqueModels([
    resolveModel("anthropic", model),
    ...ANTHROPIC_FALLBACK_CHAIN,
  ]);

  let lastError;
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    onApiProgress?.(candidate, i + 1, candidates.length);
    try {
      const result = await requestAnthropic({
        apiKey,
        model: candidate,
        systemPrompt,
        userPrompt,
      });
      return result;
    } catch (err) {
      lastError = err;
      if (!err.isModelError) throw err;
    }
  }
  throw lastError || new Error("No Anthropic models available for this API key.");
}

async function callOpenAI({ apiKey, model, systemPrompt, userPrompt }) {
  const resolvedModel = resolveModel("openai", model);
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: resolvedModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 8192,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(formatApiError(err, response.status, "OpenAI"));
  }

  const data = await response.json();
  return {
    text: data.choices?.[0]?.message?.content || "",
    usage: data.usage,
    model: data.model,
  };
}

export function parseApplicationResponse(raw) {
  let text = raw.trim();
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(
      `AI returned invalid JSON. Try again or switch model (e.g. ${ANTHROPIC_DEFAULT_MODEL}).`
    );
  }
  return {
    tailoredCV: parsed.tailoredCV || "",
    coverLetter: parsed.coverLetter || "",
    screeningAnswers: parsed.screeningAnswers || [],
    matchScore: Number(parsed.matchScore) || 0,
    matchRationale: parsed.matchRationale || "",
  };
}
