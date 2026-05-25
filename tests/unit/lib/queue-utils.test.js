import { describe, expect, it } from "vitest";
import {
  detectPlatformFromUrl,
  isInternalAppUrl,
  isSupportedJobUrl,
  parseJobUrls,
} from "../../../popup/src/lib/queue-utils.js";

describe("queue-utils", () => {
  describe("detectPlatformFromUrl", () => {
    it.each([
      ["https://boards.greenhouse.io/acme/jobs/1", "greenhouse"],
      ["https://www.linkedin.com/jobs/view/123", "linkedin"],
      ["https://www.indeed.com/viewjob?jk=abc", "indeed"],
      ["https://acme.wd5.myworkdayjobs.com/job", "workday"],
      ["https://example.com/jobs", null],
    ])("detects %s → %s", (url, expected) => {
      expect(detectPlatformFromUrl(url)).toBe(expected);
    });
  });

  describe("isSupportedJobUrl", () => {
    it("requires https and known platform", () => {
      expect(isSupportedJobUrl("https://boards.greenhouse.io/x")).toBe(true);
      expect(isSupportedJobUrl("ftp://boards.greenhouse.io/x")).toBe(false);
      expect(isSupportedJobUrl("https://google.com")).toBe(false);
    });
  });

  describe("isInternalAppUrl", () => {
    it("flags browser internal URLs", () => {
      expect(isInternalAppUrl("chrome://extensions")).toBe(true);
      expect(isInternalAppUrl("chrome-extension://abc/popup.html")).toBe(true);
      expect(isInternalAppUrl("https://indeed.com/job")).toBe(false);
      expect(isInternalAppUrl("")).toBe(true);
    });
  });

  describe("parseJobUrls", () => {
    it("parses valid lines and reports invalid", () => {
      const text = [
        "https://boards.greenhouse.io/acme/jobs/1",
        "://not a valid url",
        "https://google.com/careers",
      ].join("\n");

      const { urls, invalid } = parseJobUrls(text);
      expect(urls).toHaveLength(1);
      expect(urls[0].platform).toBe("greenhouse");
      expect(urls[0].status).toBe("pending");
      expect(invalid).toHaveLength(2);
      const reasons = invalid.map((i) => i.reason);
      expect(reasons).toContain("Invalid URL");
      expect(reasons).toContain("Unsupported platform");
    });

    it("adds https when missing", () => {
      const { urls } = parseJobUrls("www.linkedin.com/jobs/view/99");
      expect(urls[0].url).toMatch(/^https:\/\//);
      expect(urls[0].platform).toBe("linkedin");
    });
  });
});
