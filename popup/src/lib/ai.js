export function formatApiError(errBody, status, provider) {
  const msg = errBody?.error?.message || errBody?.message || "";
  if (/^model:/i.test(msg) || /model.*not found|invalid.*model/i.test(msg)) {
    const modelName = msg.replace(/^model:\s*/i, "").trim();
    return (
      `Invalid or unavailable model${modelName ? ` (“${modelName}”)` : ""}. ` +
      `Open Settings → AI provider and pick a supported model ` +
      `(e.g. claude-3-5-sonnet-20241022 or gpt-4o).`
    );
  }
  if (status === 401) return "Invalid API key. Check Settings → AI provider.";
  if (status === 429) return "Rate limited — wait a moment and try again.";
  return msg || `${provider} API error (${status})`;
}

export async function callAI({ provider, apiKey, model, systemPrompt, userPrompt }) {
  if (!apiKey) {
    throw new Error("API key not configured. Add your key in Settings.");
  }

  if (provider === "anthropic") {
    return callAnthropic({ apiKey, model, systemPrompt, userPrompt });
  }
  if (provider === "openai") {
    return callOpenAI({ apiKey, model, systemPrompt, userPrompt });
  }
  throw new Error(`Unknown AI provider: ${provider}`);
}

async function callAnthropic({ apiKey, model, systemPrompt, userPrompt }) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: model || "claude-3-5-sonnet-20241022",
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(formatApiError(err, response.status, "Anthropic"));
  }

  const data = await response.json();
  return {
    text: data.content?.[0]?.text || "",
    usage: data.usage,
    model: data.model,
  };
}

async function callOpenAI({ apiKey, model, systemPrompt, userPrompt }) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || "gpt-4o",
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
      "AI returned invalid JSON. Try again or switch model (e.g. claude-3-5-sonnet-20241022)."
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
