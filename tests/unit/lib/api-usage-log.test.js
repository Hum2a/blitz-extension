import { describe, expect, it } from "vitest";
import {
  API_USAGE_TYPES,
  summarizeApiUsage,
  usageRecordLabel,
} from "../../../popup/src/lib/api-usage-log.js";

describe("api-usage-log", () => {
  const records = [
    {
      at: new Date().toISOString(),
      type: API_USAGE_TYPES.GENERATE_APPLICATION,
      success: true,
      totalCostUsd: 0.05,
      inputTokens: 1000,
      outputTokens: 500,
      jobTitle: "Engineer",
      company: "Acme",
    },
    {
      at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      type: API_USAGE_TYPES.API_TEST,
      success: false,
      totalCostUsd: 0,
      inputTokens: 0,
      outputTokens: 0,
      errorMessage: "401",
    },
  ];

  describe("summarizeApiUsage", () => {
    it("aggregates success and failure counts", () => {
      const summary = summarizeApiUsage(records);
      expect(summary.totalCalls).toBe(2);
      expect(summary.successCount).toBe(1);
      expect(summary.failedCount).toBe(1);
      expect(summary.totalCostUsd).toBeCloseTo(0.05);
      expect(summary.thisWeekCalls).toBe(1);
    });
  });

  describe("usageRecordLabel", () => {
    it("prefers job title and company", () => {
      expect(usageRecordLabel(records[0])).toContain("Engineer");
      expect(usageRecordLabel(records[0])).toContain("Acme");
    });
  });
});
