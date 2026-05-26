import { describe, expect, it, vi } from "vitest";
import {
  GENERATION_STAGES,
  formatPromptStats,
  progressComplete,
  progressFromStage,
} from "../../../popup/src/lib/generation-progress.js";

describe("generation-progress", () => {
  it("weights sum to 100", () => {
    const total = GENERATION_STAGES.reduce((n, s) => n + s.weight, 0);
    expect(total).toBe(100);
  });

  it("progressFromStage marks prior steps done", () => {
    const p = progressFromStage("prompts", "Building prompts");
    expect(p.stageId).toBe("prompts");
    expect(p.percent).toBeGreaterThan(0);
    expect(p.percent).toBeLessThan(100);
    const promptsStep = p.steps.find((s) => s.id === "prompts");
    expect(promptsStep.status).toBe("active");
    expect(p.steps.find((s) => s.id === "validate").status).toBe("done");
  });

  it("progressComplete reaches 100%", () => {
    const p = progressComplete();
    expect(p.percent).toBe(100);
    expect(p.isComplete).toBe(true);
    expect(p.steps.every((s) => s.status === "done")).toBe(true);
  });

  it("formatPromptStats aggregates token estimates", () => {
    const stats = formatPromptStats({
      cvText: "a".repeat(400),
      linkedinText: "",
      jobData: { jobDescription: "b".repeat(200) },
      systemPrompt: "system",
      userPrompt: "user prompt",
    });
    expect(stats.cvTokens).toBe(100);
    expect(stats.summary).toMatch(/input tokens/i);
  });
});
