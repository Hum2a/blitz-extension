import { describe, expect, it } from "vitest";
import {
  countWordHtmlSanitizeFixes,
  decodeWordHtmlBytes,
  normalizeWordListsInHtml,
  sanitizeWordImportedHtml,
} from "../../../popup/src/lib/word-html-sanitize.js";

describe("word-html-sanitize", () => {
  describe("countWordHtmlSanitizeFixes", () => {
    it("counts replacement characters", () => {
      const html = "<p>Hello \uFFFD world \uFFFD</p>";
      expect(countWordHtmlSanitizeFixes(html)).toBe(2);
    });

    it("returns 0 for clean html", () => {
      expect(countWordHtmlSanitizeFixes("<p>OK</p>")).toBe(0);
    });
  });

  describe("normalizeWordListsInHtml", () => {
    it("converts MsoListParagraph to ul/li", () => {
      const wordHtml =
        '<p class="MsoListParagraph">Item one</p><p class="MsoListParagraph">Item two</p>';
      const out = normalizeWordListsInHtml(wordHtml);
      expect(out).toMatch(/<ul class="word-cv-ul">/);
      expect(out).toMatch(/<li class="word-cv-li">/);
    });
  });

  describe("sanitizeWordImportedHtml", () => {
    it("runs list + encoding cleanup", () => {
      const out = sanitizeWordImportedHtml("<p>Test \uFFFD</p>");
      expect(out).not.toContain("\uFFFD");
    });
  });

  describe("decodeWordHtmlBytes", () => {
    it("decodes utf-8 bytes", () => {
      const bytes = new TextEncoder().encode(
        '<html><head><meta charset="utf-8"></head><body>Hi</body></html>'
      );
      expect(decodeWordHtmlBytes(bytes)).toContain("Hi");
    });
  });
});
