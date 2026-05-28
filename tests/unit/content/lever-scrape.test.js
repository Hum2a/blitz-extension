import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { scrapeLeverFromDocument } from "../../helpers/scrape-lever.js";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(fixtureDir, "../../fixtures/lever-job.html"), "utf8");

describe("lever scrape (DOM fixture)", () => {
  it("extracts title, company, description, and screening labels", () => {
    document.documentElement.innerHTML = html;
    const job = scrapeLeverFromDocument(document);
    expect(job.platform).toBe("lever");
    expect(job.jobTitle).toBe("Senior Platform Engineer");
    expect(job.company).toBe("Acme Labs");
    expect(job.jobDescription).toMatch(/Senior Platform Engineer/i);
    expect(job.screeningQuestions).toContain("Full name");
    expect(job.screeningQuestions).toContain("Why do you want this role?");
  });
});
