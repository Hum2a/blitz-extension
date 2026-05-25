import { describe, expect, it } from "vitest";
import applications from "../../fixtures/applications.json" with { type: "json" };
import {
  computeHistorySummary,
  displayApplicationLabel,
  filterApplications,
  STATUS_LABELS,
} from "../../../popup/src/lib/application-history-utils.js";

describe("application-history-utils", () => {
  describe("displayApplicationLabel", () => {
    it("prefers applicationTitle when set", () => {
      expect(displayApplicationLabel(applications[0])).toBe("Senior Engineer — Acme");
    });

    it("builds role — company from fields", () => {
      expect(displayApplicationLabel(applications[1])).toBe("Product Manager - Beta Ltd");
    });

    it("falls back to company or Application", () => {
      expect(displayApplicationLabel(applications[2])).toBe("Gamma");
      expect(displayApplicationLabel({})).toBe("Application");
    });
  });

  describe("computeHistorySummary", () => {
    it("aggregates counts and response rate", () => {
      const summary = computeHistorySummary(applications);
      expect(summary.total).toBe(3);
      expect(summary.interviews).toBe(1);
      expect(summary.applied).toBe(1);
      expect(summary.responseRate).toBeGreaterThanOrEqual(0);
      expect(summary.responseRate).toBeLessThanOrEqual(100);
    });

    it("returns zeros for empty list", () => {
      expect(computeHistorySummary([])).toEqual({
        total: 0,
        thisWeek: 0,
        interviews: 0,
        offers: 0,
        applied: 0,
        responseRate: 0,
      });
    });
  });

  describe("filterApplications", () => {
    it("filters by status and search", () => {
      const filtered = filterApplications(applications, {
        statusFilter: "interview",
        search: "beta",
      });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].company).toBe("Beta Ltd");
    });

    it("sorts newest first", () => {
      const sorted = filterApplications(applications, { statusFilter: "all", search: "" });
      expect(sorted[0].id).toBe("app-1");
    });
  });

  describe("STATUS_LABELS", () => {
    it("maps every status to a label", () => {
      expect(STATUS_LABELS.applied).toBe("Applied");
      expect(STATUS_LABELS.offer).toBe("Offer");
    });
  });
});
