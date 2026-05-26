import { describe, expect, it } from "vitest";
import jobs from "../../fixtures/jobs.json" with { type: "json" };
import {
  estimateCostFromPromptBundle,
  estimateCostFromPrompts,
} from "../../../popup/src/lib/cost-estimate.js";
import { buildApplicationPrompts } from "../../../popup/src/lib/prompts.js";

describe("cost-estimate (prompt bundles)", () => {
  it("estimates cost from prompt bundle", () => {
    const bundle = buildApplicationPrompts({
      cvText: "x".repeat(4000),
      jobData: jobs.greenhouse,
      preferences: {},
      userProfile: { name: "Jane" },
    });
    const estimate = estimateCostFromPromptBundle(bundle, {
      provider: "anthropic",
      model: "claude-sonnet-4-6",
    });
    expect(estimate.isEstimate).toBe(true);
    expect(estimate.totalCostUsd).toBeGreaterThan(0);
    expect(estimate.breakdown.length).toBeGreaterThan(1);
    expect(estimate.partCosts.includeBaseCv.tokens).toBeGreaterThan(0);
  });

  it("supports legacy estimateCostFromPrompts", () => {
    const estimate = estimateCostFromPrompts({
      provider: "openai",
      model: "gpt-4o",
      systemPrompt: "system ".repeat(100),
      userPrompt: "user ".repeat(200),
    });
    expect(estimate.inputTokens).toBeGreaterThan(0);
    expect(estimate.totalCostUsd).toBeGreaterThan(0);
  });
});
