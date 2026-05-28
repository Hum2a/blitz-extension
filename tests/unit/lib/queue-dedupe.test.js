import { describe, expect, it } from "vitest";
import {
  dedupeQueueAdditions,
  normalizeQueueUrl,
  queueItemDedupeKey,
} from "../../../popup/src/lib/queue-dedupe.js";

describe("normalizeQueueUrl", () => {
  it("strips tracking params and /apply suffix", () => {
    const url =
      "https://boards.greenhouse.io/acme/jobs/123/apply?utm_source=linkedin&ref=x";
    expect(normalizeQueueUrl(url)).toBe("https://boards.greenhouse.io/acme/jobs/123");
  });
});

describe("dedupeQueueAdditions", () => {
  it("skips URLs already in queue", () => {
    const existing = [
      {
        url: "https://boards.greenhouse.io/acme/jobs/123",
        platform: "greenhouse",
        status: "pending",
      },
    ];
    const incoming = [
      {
        url: "https://boards.greenhouse.io/acme/jobs/123/apply?utm_source=x",
        platform: "greenhouse",
        status: "pending",
      },
    ];
    const { accepted, duplicates } = dedupeQueueAdditions(incoming, existing, []);
    expect(accepted).toHaveLength(0);
    expect(duplicates).toHaveLength(1);
    expect(duplicates[0].reason).toMatch(/queue/i);
  });

  it("skips jobs already in history by listing key", () => {
    const history = [
      { listingKey: "greenhouse:/acme/jobs/123", url: "https://boards.greenhouse.io/acme/jobs/123" },
    ];
    const incoming = [
      {
        url: "https://boards.greenhouse.io/acme/jobs/123",
        platform: "greenhouse",
        jobData: { platform: "greenhouse", company: "Acme", jobTitle: "Engineer" },
        status: "pending",
      },
    ];
    const { accepted, duplicates } = dedupeQueueAdditions(incoming, [], history);
    expect(accepted).toHaveLength(0);
    expect(duplicates[0].reason).toMatch(/history/i);
  });

  it("accepts unique URLs", () => {
    const incoming = [
      {
        url: "https://boards.greenhouse.io/acme/jobs/1",
        platform: "greenhouse",
        status: "pending",
      },
      {
        url: "https://boards.greenhouse.io/acme/jobs/2",
        platform: "greenhouse",
        status: "pending",
      },
    ];
    const { accepted, duplicates } = dedupeQueueAdditions(incoming, [], []);
    expect(accepted).toHaveLength(2);
    expect(duplicates).toHaveLength(0);
  });
});

describe("queueItemDedupeKey", () => {
  it("prefers listing key when job data present", () => {
    const key = queueItemDedupeKey({
      url: "https://boards.greenhouse.io/x",
      jobData: { platform: "greenhouse", company: "X", jobTitle: "Dev" },
    });
    expect(key).toMatch(/^listing:/);
  });
});
