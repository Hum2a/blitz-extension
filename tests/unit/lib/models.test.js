import { describe, expect, it } from "vitest";
import {
  ANTHROPIC_DEFAULT_MODEL,
  isModelErrorMessage,
  remapAnthropicModel,
  uniqueModels,
} from "../../../popup/src/lib/models.js";

describe("models", () => {
  describe("remapAnthropicModel", () => {
    it("returns default when empty", () => {
      expect(remapAnthropicModel("")).toBe(ANTHROPIC_DEFAULT_MODEL);
      expect(remapAnthropicModel(undefined)).toBe(ANTHROPIC_DEFAULT_MODEL);
    });

    it("remaps retired IDs", () => {
      expect(remapAnthropicModel("claude-3-5-sonnet-20241022")).toBe(
        ANTHROPIC_DEFAULT_MODEL
      );
    });

    it("passes through current model ids", () => {
      expect(remapAnthropicModel("claude-sonnet-4-6")).toBe("claude-sonnet-4-6");
    });
  });

  describe("uniqueModels", () => {
    it("deduplicates while preserving order", () => {
      expect(uniqueModels(["a", "b", "a", "", "c", "b"])).toEqual(["a", "b", "c"]);
    });
  });

  describe("isModelErrorMessage", () => {
    it.each([
      ["model: claude-old", true],
      ["The model does not exist", true],
      ["Rate limited", false],
      ["", false],
    ])("%s → %s", (msg, expected) => {
      expect(isModelErrorMessage(msg)).toBe(expected);
    });
  });
});
