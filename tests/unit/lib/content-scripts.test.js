import { describe, expect, it } from "vitest";
import {
  detectPlatformFromHost,
  safeHostname,
  scriptsForUrl,
} from "../../../popup/src/lib/content-scripts.js";

describe("content-scripts", () => {
  describe("scriptsForUrl", () => {
    it("returns greenhouse bundle", () => {
      const scripts = scriptsForUrl("https://boards.greenhouse.io/acme/jobs/1");
      expect(scripts).toContain("content/greenhouse.js");
      expect(scripts).toContain("content/detector.js");
    });

    it("returns linkedin bundle only for /jobs URLs", () => {
      expect(scriptsForUrl("https://www.linkedin.com/jobs/view/1")).toContain(
        "content/linkedin.js"
      );
      expect(scriptsForUrl("https://www.linkedin.com/in/me")).toBeNull();
    });

    it("returns null for unsupported hosts", () => {
      expect(scriptsForUrl("https://example.com/jobs")).toBeNull();
    });
  });

  describe("safeHostname", () => {
    it("parses valid URLs", () => {
      expect(safeHostname("https://indeed.com/viewjob?jk=1")).toBe("indeed.com");
    });

    it("truncates invalid URLs", () => {
      expect(safeHostname("not-a-url")).toBe("not-a-url");
    });
  });

  describe("detectPlatformFromHost", () => {
    it.each([
      ["boards.greenhouse.io", "greenhouse"],
      ["www.linkedin.com", "linkedin"],
      ["www.indeed.co.uk", "indeed"],
      ["acme.wd5.myworkdayjobs.com", "workday"],
      ["google.com", null],
    ])("%s → %s", (host, expected) => {
      expect(detectPlatformFromHost(host)).toBe(expected);
    });
  });
});
