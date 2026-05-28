import { describe, expect, it } from "vitest";
import jobs from "../../fixtures/jobs.json" with { type: "json" };
import {
  applicationMatchesJob,
  listingKey,
  withListingKey,
} from "../../../popup/src/lib/job-listing.js";

describe("job-listing", () => {
  describe("listingKey", () => {
    it("normalizes Greenhouse pathname", () => {
      expect(listingKey(jobs.greenhouse)).toBe(
        "greenhouse:/acme/jobs/123"
      );
    });

    it("extracts LinkedIn view id", () => {
      expect(listingKey(jobs.linkedin)).toBe("linkedin:view:9876543210");
    });

    it("uses Indeed jk param", () => {
      expect(listingKey(jobs.indeed)).toBe("indeed:jk:abc123def");
    });

    it("normalizes Lever posting path", () => {
      expect(
        listingKey({
          platform: "lever",
          url: "https://jobs.lever.co/acme/11111111-2222-3333-4444-555555555555",
        })
      ).toBe("lever:acme:11111111-2222-3333-4444-555555555555");
    });

    it("normalizes Ashby posting path", () => {
      expect(
        listingKey({
          platform: "ashby",
          url: "https://jobs.ashbyhq.com/acme/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        })
      ).toBe("ashby:acme:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
    });

    it("falls back to title|company when no URL", () => {
      expect(listingKey(jobs.titleCompanyOnly)).toBe(
        "greenhouse|data scientist|delta inc"
      );
    });

    it("returns null for empty job", () => {
      expect(listingKey(null)).toBeNull();
    });
  });

  describe("applicationMatchesJob", () => {
    it("matches when listing keys align", () => {
      const app = {
        listingKey: listingKey(jobs.greenhouse),
        jobData: jobs.greenhouse,
        role: "Senior Engineer",
        company: "Acme Corp",
      };
      expect(applicationMatchesJob(app, jobs.greenhouse)).toBe(true);
    });

    it("rejects conflicting title on same key", () => {
      const app = {
        listingKey: listingKey(jobs.greenhouse),
        jobData: { ...jobs.greenhouse, jobTitle: "Junior Engineer" },
      };
      expect(applicationMatchesJob(app, jobs.greenhouse)).toBe(false);
    });

    it("matches title+company without URL", () => {
      const app = {
        role: "Data Scientist",
        company: "Delta Inc",
        jobData: { jobTitle: "Data Scientist", company: "Delta Inc" },
      };
      expect(applicationMatchesJob(app, jobs.titleCompanyOnly)).toBe(true);
    });
  });

  describe("withListingKey", () => {
    it("attaches listingKey from jobData", () => {
      const result = withListingKey({ id: "a1" }, jobs.linkedin);
      expect(result.listingKey).toBe("linkedin:view:9876543210");
      expect(result.jobData).toEqual(jobs.linkedin);
    });
  });
});
