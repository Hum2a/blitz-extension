import { describe, expect, it } from "vitest";
import { queueItemsFromTabs } from "../../../background/tab-jobs.js";

describe("tab-jobs", () => {
  describe("queueItemsFromTabs", () => {
    const capturableTab = {
      capturable: true,
      url: "https://boards.greenhouse.io/acme/jobs/99",
      platform: "greenhouse",
      tabId: 1,
      title: "Engineer role",
      jobData: { jobTitle: "Engineer", company: "Acme" },
    };

    it("adds capturable tabs not already in queue", () => {
      const added = queueItemsFromTabs([capturableTab], []);
      expect(added).toHaveLength(1);
      expect(added[0].url).toBe(capturableTab.url);
      expect(added[0].status).toBe("pending");
      expect(added[0].sourceTabId).toBe(1);
    });

    it("skips duplicate URLs", () => {
      const existing = [{ url: capturableTab.url }];
      expect(queueItemsFromTabs([capturableTab], existing)).toHaveLength(0);
    });

    it("skips non-capturable tabs", () => {
      const added = queueItemsFromTabs([{ ...capturableTab, capturable: false }], []);
      expect(added).toHaveLength(0);
    });
  });
});
