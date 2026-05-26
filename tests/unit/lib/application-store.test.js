import { describe, expect, it } from "vitest";
import jobs from "../../fixtures/jobs.json" with { type: "json" };
import { listingKey } from "../../../popup/src/lib/job-listing.js";
import {
  HISTORY_EVENT_TYPES,
  buildHistoryRecord,
  findApplicationInList,
  formatHistoryEvent,
} from "../../../popup/src/lib/application-store.js";

describe("application-store", () => {
  const ghKey = listingKey(jobs.greenhouse);
  const applications = [
    { id: "1", listingKey: ghKey, role: "Senior Engineer", company: "Acme Corp" },
    { id: "2", listingKey: "linkedin:view:99", role: "PM", company: "Beta" },
  ];

  describe("findApplicationInList", () => {
    it("finds by listing key", () => {
      const found = findApplicationInList(applications, jobs.greenhouse);
      expect(found?.id).toBe("1");
    });

    it("returns null when no match", () => {
      expect(findApplicationInList(applications, jobs.workday)).toBeNull();
    });
  });

  describe("buildHistoryRecord", () => {
    it("creates a generated record with event", () => {
      const record = buildHistoryRecord(
        { applicationTitle: "Eng — Acme", matchScore: 80, tailoredCV: "CV" },
        jobs.greenhouse
      );
      expect(record.status).toBe("generated");
      expect(record.listingKey).toBeTruthy();
      expect(record.events[0].type).toBe(HISTORY_EVENT_TYPES.GENERATED);
      expect(record.matchScore).toBe(80);
    });

    it("preserves applied status when regenerating", () => {
      const existing = {
        id: "x",
        status: "applied",
        generatedAt: "2026-01-01T00:00:00.000Z",
        events: [],
      };
      const record = buildHistoryRecord({ matchScore: 70 }, jobs.greenhouse, {
        existing,
        eventType: HISTORY_EVENT_TYPES.REGENERATED,
      });
      expect(record.status).toBe("applied");
      expect(record.events[0].type).toBe(HISTORY_EVENT_TYPES.REGENERATED);
    });
  });

  describe("formatHistoryEvent", () => {
    it("maps known event types", () => {
      expect(formatHistoryEvent(HISTORY_EVENT_TYPES.FORM_FILLED)).toBe("Form filled");
      expect(formatHistoryEvent("unknown")).toBe("unknown");
    });
  });
});
