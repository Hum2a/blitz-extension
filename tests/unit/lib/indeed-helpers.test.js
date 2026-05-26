import { describe, expect, it } from "vitest";
import { findJobPostingInJsonLd, isIndeedViewJobUrl } from "../../../popup/src/lib/indeed-helpers.js";

describe("indeed-helpers", () => {
  it("detects viewjob URLs with jk param", () => {
    const path = "/viewjob";
    const search =
      "?jk=0e5149bbe33e0279&tk=1jphr7q4npge2802&from=jobi2a&advn=9365983875468486";
    expect(isIndeedViewJobUrl(`${path}${search}`)).toBe(true);
  });

  it("detects search split-view vjk", () => {
    expect(isIndeedViewJobUrl("/jobs?q=developer&vjk=abc123")).toBe(true);
  });

  it("parses JobPosting from JSON-LD graph", () => {
    const posting = findJobPostingInJsonLd({
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "WebPage", name: "x" },
        {
          "@type": "JobPosting",
          title: "Web Developer",
          description: "<p>Build websites</p>",
        },
      ],
    });
    expect(posting?.title).toBe("Web Developer");
    expect(posting?.description).toContain("Build websites");
  });
});
