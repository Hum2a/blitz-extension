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
      model: model || "claude-sonnet-4-20250514",
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || "";
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
    throw new Error(err.error?.message || `OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

export function parseApplicationResponse(raw) {
  let text = raw.trim();
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }

  const parsed = JSON.parse(text);
  return {
    tailoredCV: parsed.tailoredCV || "",
    coverLetter: parsed.coverLetter || "",
    screeningAnswers: parsed.screeningAnswers || [],
    matchScore: Number(parsed.matchScore) || 0,
    matchRationale: parsed.matchRationale || "",
  };
}
