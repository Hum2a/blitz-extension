import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROMPT_PARTS,
  estimateOutputTokens,
  normalizePromptParts,
} from "../../../popup/src/lib/prompt-parts.js";

describe("prompt-parts", () => {
  describe("normalizePromptParts", () => {
    it("merges defaults with preferences", () => {
      const parts = normalizePromptParts({
        promptParts: { includeBaseCv: false },
      });
      expect(parts.includeBaseCv).toBe(false);
      expect(parts.includeCvPrinciples).toBe(true);
    });

    it("disables cover letter when mode is never", () => {
      const parts = normalizePromptParts({
        coverLetterMode: "never",
        promptParts: { includeCoverLetter: true },
      });
      expect(parts.includeCoverLetter).toBe(false);
    });
  });

  describe("estimateOutputTokens", () => {
    it("increases with cover letter and screening", () => {
      const noCover = estimateOutputTokens(
        { ...DEFAULT_PROMPT_PARTS, includeCoverLetter: false },
        {}
      );
      const withCover = estimateOutputTokens(
        { ...DEFAULT_PROMPT_PARTS, includeCoverLetter: true },
        {}
      );
      const withScreening = estimateOutputTokens(DEFAULT_PROMPT_PARTS, {
        screeningQuestions: [{ q: "1" }, { q: "2" }],
      });
      expect(withCover).toBeGreaterThan(noCover);
      expect(withScreening).toBeGreaterThan(
        estimateOutputTokens(
          { ...DEFAULT_PROMPT_PARTS, includeScreeningQuestions: false },
          { screeningQuestions: [{ q: "1" }, { q: "2" }] }
        )
      );
    });
  });
});
