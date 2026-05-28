import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { callAI } from "../../../popup/src/lib/ai.js";

describe("callAI providers", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url) => {
        if (String(url).includes("generativelanguage.googleapis.com")) {
          return {
            ok: true,
            json: async () => ({
              candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }],
              usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
            }),
          };
        }
        if (String(url).includes("openrouter.ai")) {
          return {
            ok: true,
            json: async () => ({
              choices: [{ message: { content: '{"ok":true}' } }],
              usage: { prompt_tokens: 10, completion_tokens: 5 },
              model: "google/gemini-2.0-flash-001",
            }),
          };
        }
        throw new Error(`unexpected fetch: ${url}`);
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls Google Gemini API", async () => {
    const result = await callAI({
      provider: "google",
      apiKey: "test-key",
      model: "gemini-2.0-flash",
      systemPrompt: "sys",
      userPrompt: "user",
    });
    expect(result.text).toContain("ok");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("generativelanguage.googleapis.com"),
      expect.any(Object)
    );
  });

  it("calls OpenRouter API", async () => {
    const result = await callAI({
      provider: "openrouter",
      apiKey: "test-key",
      model: "google/gemini-2.0-flash-001",
      systemPrompt: "sys",
      userPrompt: "user",
    });
    expect(result.text).toContain("ok");
    expect(fetch).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/chat/completions",
      expect.objectContaining({ method: "POST" })
    );
  });
});
