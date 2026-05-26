import { describe, expect, it } from "vitest";
import jobs from "../../fixtures/jobs.json" with { type: "json" };
import {
  buildApplicationPrompts,
  buildSystemPrompt,
  formatApplicationTitle,
} from "../../../popup/src/lib/prompts.js";

describe("prompts", () => {
  describe("formatApplicationTitle", () => {
    it("prefers AI title and normalizes em dashes", () => {
      expect(formatApplicationTitle(jobs.greenhouse, "Role — Co")).toBe("Role  -  Co");
    });

    it("builds from job data when AI title missing", () => {
      expect(formatApplicationTitle(jobs.greenhouse, "")).toBe("Senior Engineer - Acme Corp");
    });
  });

  describe("buildSystemPrompt", () => {
    it("includes CV principles when enabled", () => {
      const prompt = buildSystemPrompt(
        { name: "Jane" },
        { includeCvPrinciples: true, includeSystemProfile: false }
      );
      expect(prompt).toMatch(/CV writing rules/i);
      expect(prompt).not.toMatch(/User profile for screening/i);
    });

    it("includes profile block when enabled", () => {
      const prompt = buildSystemPrompt(
        { name: "Jane", rightToWork: "UK" },
        { includeCvPrinciples: false, includeSystemProfile: true }
      );
      expect(prompt).toMatch(/User profile for screening/i);
      expect(prompt).toMatch(/Jane/);
    });
  });

  describe("buildApplicationPrompts", () => {
    it("assembles input parts and estimates output tokens", () => {
      const bundle = buildApplicationPrompts({
        cvText: "My CV content here",
        jobData: jobs.greenhouse,
        preferences: {},
        userProfile: { name: "Jane" },
      });
      expect(bundle.systemPrompt.length).toBeGreaterThan(100);
      expect(bundle.userPrompt).toMatch(/Job Title/i);
      expect(bundle.inputParts.some((p) => p.key === "cv")).toBe(true);
      expect(bundle.outputTokensEstimate).toBeGreaterThan(1000);
    });

    it("tracks excluded parts when toggles off", () => {
      const bundle = buildApplicationPrompts({
        cvText: "CV",
        jobData: jobs.greenhouse,
        preferences: {
          promptParts: {
            includeBaseCv: false,
            includeJobDescription: false,
          },
        },
        userProfile: {},
      });
      expect(bundle.excludedParts).toContain("Base CV");
      expect(bundle.excludedParts).toContain("Job listing");
    });
  });
});
