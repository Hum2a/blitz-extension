import { describe, expect, it } from "vitest";
import aiResponses from "../../fixtures/ai-responses.json" with { type: "json" };
import {
  formatApiError,
  parseApplicationResponse,
  resolveModel,
} from "../../../popup/src/lib/ai.js";

describe("ai", () => {
  describe("resolveModel", () => {
    it("remaps retired Anthropic models", () => {
      expect(resolveModel("anthropic", "claude-3-5-sonnet-20241022")).toBe(
        "claude-sonnet-4-6"
      );
    });

    it("defaults OpenAI when model empty", () => {
      expect(resolveModel("openai", "")).toBe("gpt-4o");
      expect(resolveModel("openai", "  ")).toBe("gpt-4o");
    });
  });

  describe("formatApiError", () => {
    it("maps 401 to API key message", () => {
      expect(formatApiError({}, 401, "OpenAI")).toMatch(/API key/i);
    });

    it("maps model errors to settings hint", () => {
      const msg = formatApiError({ error: { message: "model: bad-id" } }, 400, "Anthropic");
      expect(msg).toMatch(/Settings/i);
      expect(msg).toMatch(/bad-id/);
    });
  });

  describe("parseApplicationResponse", () => {
    it("parses bare JSON", () => {
      const result = parseApplicationResponse(aiResponses.validJson);
      expect(result.applicationTitle).toBe("Engineer at Acme");
      expect(result.matchScore).toBe(88);
      expect(result.screeningAnswers).toHaveLength(1);
    });

    it("strips markdown fences", () => {
      const result = parseApplicationResponse(aiResponses.fencedJson);
      expect(result.applicationTitle).toBe("PM, Beta");
    });

    it("humanizes em dashes in output", () => {
      const result = parseApplicationResponse(aiResponses.withEmDash);
      expect(result.applicationTitle).not.toContain("\u2014");
      expect(result.tailoredCV).toContain(",");
    });

    it("throws on invalid JSON", () => {
      expect(() => parseApplicationResponse(aiResponses.invalid)).toThrow(
        /invalid JSON/i
      );
    });
  });
});
