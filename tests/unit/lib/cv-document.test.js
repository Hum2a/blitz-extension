import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import {
  parseTailoredCvText,
  resolveCvDocument,
} from "../../../popup/src/lib/cv-document.js";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const tailoredCv = readFileSync(join(fixtureDir, "../../fixtures/tailored-cv.txt"), "utf8");

describe("cv-document", () => {
  describe("parseTailoredCvText", () => {
    it("parses sections from plain-text CV", () => {
      const doc = parseTailoredCvText(tailoredCv, {
        name: "Jane Doe",
        email: "jane@example.com",
      });
      expect(doc.fullName).toBe("Jane Doe");
      expect(doc.summary).toMatch(/distributed systems/i);
      expect(doc.education.length).toBeGreaterThan(0);
      expect(doc.skillGroups.length).toBeGreaterThan(0);
      expect(doc.jobs.length).toBeGreaterThan(0);
      expect(doc.jobs[0].company).toMatch(/Acme/i);
    });
  });

  describe("resolveCvDocument", () => {
    it("merges structured document with parsed tailored text", () => {
      const resolved = resolveCvDocument({
        cvDocument: { fullName: "Jane Doe", summary: "Short" },
        tailoredCV: tailoredCv,
        userProfile: { name: "Jane Doe", email: "jane@example.com" },
      });
      expect(resolved.summary).toMatch(/distributed systems/i);
      expect(resolved.contactLineHtml || resolved.contactLine).toBeTruthy();
    });

    it("returns null without cvDocument or tailored text", () => {
      expect(resolveCvDocument({ tailoredCV: "", userProfile: {} })).toBeNull();
    });
  });
});
