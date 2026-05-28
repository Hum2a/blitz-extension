import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { scrapeAshbyFromDocument } from "../../helpers/scrape-ashby.js";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(fixtureDir, "../../fixtures/ashby-job.html"), "utf8");

describe("ashby scrape (DOM fixture)", () => {
  it("extracts title, company, and description", () => {
    document.documentElement.innerHTML = html;
    const job = scrapeAshbyFromDocument(document);
    expect(job.platform).toBe("ashby");
    expect(job.jobTitle).toBe("Backend Engineer");
    expect(job.company).toBe("Ashby Demo Co");
    expect(job.jobDescription).toMatch(/backend team/i);
    expect(job.externalApply).toBe(false);
  });
});
