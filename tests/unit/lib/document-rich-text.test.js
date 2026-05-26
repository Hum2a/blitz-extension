import { describe, expect, it } from "vitest";
import {
  plainTextToDocumentHtml,
  htmlToPlainText,
  isRichHtml,
  bodyHtmlForExport,
} from "../../../popup/src/lib/document-rich-text.js";

describe("document-rich-text", () => {
  it("detects HTML vs plain text", () => {
    expect(isRichHtml("<p>Hi</p>")).toBe(true);
    expect(isRichHtml("Hello\nWorld")).toBe(false);
  });

  it("converts plain CV lines to HTML", () => {
    const html = plainTextToDocumentHtml("JANE DOE\n\nPROFESSIONAL SUMMARY\n\nExperienced dev.");
    expect(html).toContain("<h2>");
    expect(html).toContain("PROFESSIONAL SUMMARY");
    expect(html).toContain("Experienced dev");
  });

  it("round-trips plain text through HTML", () => {
    const plain = "Line one\n\nLine two";
    const back = htmlToPlainText(plainTextToDocumentHtml(plain));
    expect(back).toContain("Line one");
    expect(back).toContain("Line two");
  });

  it("strips rich HTML to plain text", () => {
    const plain = htmlToPlainText("<p>Hello <strong>world</strong></p><ul><li>Item</li></ul>");
    expect(plain).toContain("Hello");
    expect(plain).toContain("world");
    expect(plain).toContain("Item");
  });

  it("exports sanitized body HTML", () => {
    const body = bodyHtmlForExport("Title\n\nBody");
    expect(body).toContain("<p>");
  });
});
