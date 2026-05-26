import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { scrapeGreenhouseFromDocument } from "../../helpers/scrape-greenhouse.js";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(fixtureDir, "../../fixtures/greenhouse-job.html"), "utf8");

describe("greenhouse scrape (DOM fixture)", () => {
  it("extracts title, company, description, and screening labels", () => {
    document.documentElement.innerHTML = html;
    const job = scrapeGreenhouseFromDocument(document);
    expect(job.platform).toBe("greenhouse");
    expect(job.jobTitle).toBe("Senior Engineer");
    expect(job.company).toBe("Acme Corp");
    expect(job.jobDescription).toMatch(/scalable APIs/i);
    expect(job.screeningQuestions).toContain("First Name");
    expect(job.screeningQuestions).toContain("Why do you want this role?");
  });
});
