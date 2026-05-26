import { describe, expect, it } from "vitest";
import {
  aggregateApplicationAnalytics,
  aggregateApiUsageAnalytics,
  countByDay,
  bucketMatchScores,
} from "../../../popup/src/lib/user-analytics.js";

describe("user-analytics", () => {
  it("counts applications by day", () => {
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const apps = [
      { id: "1", status: "generated", updatedAt: today.toISOString() },
      { id: "2", status: "applied", updatedAt: today.toISOString(), appliedAt: today.toISOString() },
    ];
    const series = countByDay(apps, (a) => {
      const d = new Date(a.updatedAt);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }, 7);
    const todayRow = series.find((r) => r.day === todayKey);
    expect(todayRow?.count).toBe(2);
  });

  it("aggregates application breakdowns", () => {
    const apps = [
      { id: "1", status: "generated", platform: "greenhouse", company: "Acme", matchScore: 80, updatedAt: "2025-01-01" },
      { id: "2", status: "interview", platform: "linkedin", company: "Beta", matchScore: 60, updatedAt: "2025-01-02" },
    ];
    const data = aggregateApplicationAnalytics(apps);
    expect(data.summary.total).toBe(2);
    expect(data.byPlatform.length).toBeGreaterThan(0);
    expect(data.tableRows.length).toBe(2);
  });

  it("buckets match scores", () => {
    const buckets = bucketMatchScores([
      { matchScore: 40 },
      { matchScore: 75 },
      { matchScore: null },
    ]);
    expect(buckets.find((b) => b.label === "0–49")?.count).toBe(1);
    expect(buckets.find((b) => b.label === "70–84")?.count).toBe(1);
    expect(buckets.find((b) => b.label === "No score")?.count).toBe(1);
  });

  it("aggregates API usage", () => {
    const today = new Date().toISOString().slice(0, 10);
    const records = [
      {
        at: `${today}T10:00:00.000Z`,
        success: true,
        provider: "anthropic",
        model: "claude",
        type: "generate_application",
        platform: "greenhouse",
        totalCostUsd: 0.05,
        inputTokens: 100,
        outputTokens: 50,
      },
    ];
    const data = aggregateApiUsageAnalytics(records);
    expect(data.summary.totalCalls).toBe(1);
    expect(data.byProvider[0].label).toBe("anthropic");
  });
});
