import { describe, expect, it } from "vitest";
import { DEFAULT_CV_HTML_TEMPLATE } from "../../../popup/src/lib/cv-template-default.js";
import { normalizeCvDocument, renderCvHtml } from "../../../popup/src/lib/cv-template-engine.js";

const sampleDoc = {
  fullName: "Jane Doe",
  contactLineHtml: "<span>jane@example.com</span>",
  summaryHtml: "<p>Summary here</p>",
  jobs: [
    {
      company: "Acme",
      role: "Engineer",
      dates: "2022 - Present",
      bullets: ["Built APIs"],
    },
  ],
  education: [{ heading: "Uni", lines: ["BSc CS"] }],
  skillGroups: [{ label: "Lang", value: "TS, Python" }],
};

describe("cv-template-engine", () => {
  describe("normalizeCvDocument", () => {
    it("normalizes bullets and jobs", () => {
      const norm = normalizeCvDocument(sampleDoc);
      expect(norm.jobs[0].bullets[0].text).toBe("Built APIs");
      expect(norm.skillGroups[0].label).toBe("Lang");
    });

    it("returns null for invalid input", () => {
      expect(normalizeCvDocument(null)).toBeNull();
    });
  });

  describe("renderCvHtml", () => {
    it("renders top-level variables and job loops", () => {
      const template = `<h1>{{fullName}}</h1>{{#jobs}}<section class="job"></section>{{/jobs}}`;
      const html = renderCvHtml(template, sampleDoc);
      expect(html).toContain("Jane Doe");
      expect((html.match(/class="job"/g) || []).length).toBe(1);
    });

    it("normalizeCvDocument preserves job fields for templates", () => {
      const norm = normalizeCvDocument(sampleDoc);
      expect(norm.jobs[0].company).toBe("Acme");
      expect(norm.jobs[0].role).toBe("Engineer");
    });

    it("renders default template without throwing", () => {
      const html = renderCvHtml(DEFAULT_CV_HTML_TEMPLATE, sampleDoc);
      expect(html).toContain("Jane Doe");
    });
  });
});
