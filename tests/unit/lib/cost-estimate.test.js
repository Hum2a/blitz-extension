import { describe, expect, it } from "vitest";
import {
  costFromUsage,
  estimateTokens,
  formatTokens,
  formatUsd,
  getModelPricing,
} from "../../../popup/src/lib/cost-estimate.js";

describe("cost-estimate", () => {
  describe("estimateTokens", () => {
    it("ceil-divides character length by 4", () => {
      expect(estimateTokens("abcd")).toBe(1);
      expect(estimateTokens("abcde")).toBe(2);
      expect(estimateTokens("")).toBe(0);
    });
  });

  describe("getModelPricing", () => {
    it("returns known model rates", () => {
      const p = getModelPricing("anthropic", "claude-sonnet-4-6");
      expect(p.input).toBe(3);
      expect(p.output).toBe(15);
    });

    it("falls back to provider default", () => {
      const p = getModelPricing("openai", "unknown-model-xyz");
      expect(p.input).toBeGreaterThan(0);
    });
  });

  describe("costFromUsage", () => {
    it("computes USD from Anthropic usage shape", () => {
      const cost = costFromUsage(
        { input_tokens: 1000, output_tokens: 500 },
        "anthropic",
        "claude-sonnet-4-6"
      );
      expect(cost.inputTokens).toBe(1000);
      expect(cost.outputTokens).toBe(500);
      expect(cost.totalCostUsd).toBeGreaterThan(0);
      expect(cost.isEstimate).toBe(false);
    });

    it("returns null without usage", () => {
      expect(costFromUsage(null, "openai", "gpt-4o")).toBeNull();
    });
  });

  describe("formatUsd / formatTokens", () => {
    it("formats small amounts", () => {
      expect(formatUsd(0.005)).toBe("<$0.01");
      expect(formatUsd(1.234)).toBe("$1.23");
    });

    it("formats token counts", () => {
      expect(formatTokens(1500)).toBe("1.5k");
      expect(formatTokens(42)).toBe("42");
    });
  });
});
