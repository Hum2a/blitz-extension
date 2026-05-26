import { beforeEach, describe, expect, it, vi } from "vitest";
import { callAI } from "../../../popup/src/lib/ai.js";

describe("ai (network)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("throws without API key", async () => {
    await expect(
      callAI({
        provider: "openai",
        apiKey: "",
        model: "gpt-4o",
        systemPrompt: "s",
        userPrompt: "u",
      })
    ).rejects.toThrow(/API key/i);
  });

  it("calls OpenAI and returns text + usage", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"ok":true}' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
        model: "gpt-4o",
      }),
    });

    const result = await callAI({
      provider: "openai",
      apiKey: "sk-test",
      model: "gpt-4o",
      systemPrompt: "system",
      userPrompt: "user",
    });

    expect(result.text).toContain("ok");
    expect(result.usage.prompt_tokens).toBe(10);
    expect(fetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/chat/completions",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("throws on unknown provider", async () => {
    await expect(
      callAI({
        provider: "unknown",
        apiKey: "k",
        systemPrompt: "s",
        userPrompt: "u",
      })
    ).rejects.toThrow(/Unknown AI provider/i);
  });
});
