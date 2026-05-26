import { describe, expect, it } from "vitest";
import { rawHtmlToCvTemplate } from "../../../popup/src/lib/word-html-import.js";

describe("word-html-import", () => {
  it("wraps raw HTML in cv-page shell", () => {
    const html = rawHtmlToCvTemplate("<p>Hello CV</p>", { preserveLayout: true });
    expect(html).toMatch(/cv-page/i);
    expect(html).toContain("Hello CV");
  });

  it("sanitizes when autoSanitize enabled", () => {
    const html = rawHtmlToCvTemplate("<p>Broken \uFFFD char</p>");
    expect(html).not.toContain("\uFFFD");
  });
});
