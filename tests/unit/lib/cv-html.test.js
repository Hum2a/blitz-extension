import { describe, expect, it } from "vitest";
import {
  anchorHtml,
  buildContactLineHtml,
  escapeHtmlText,
  linkifyPlainContact,
  plainTextToSummaryHtml,
} from "../../../popup/src/lib/cv-html.js";

describe("cv-html", () => {
  describe("escapeHtmlText", () => {
    it("escapes HTML special characters", () => {
      expect(escapeHtmlText(`<script>"x"&`)).toBe("&lt;script&gt;&quot;x&quot;&amp;");
    });
  });

  describe("anchorHtml", () => {
    it("builds mailto and https links", () => {
      expect(anchorHtml("Email", "mailto:jane@example.com")).toContain("mailto:jane@example.com");
      expect(anchorHtml("GitHub", "github.com/jane")).toContain("https://github.com/jane");
    });

    it("escapes label when URL missing", () => {
      expect(anchorHtml("<b>", "")).toBe("&lt;b&gt;");
    });
  });

  describe("buildContactLineHtml", () => {
    it("includes profile links", () => {
      const html = buildContactLineHtml({
        location: "London",
        email: "jane@example.com",
        github: "https://github.com/jane",
      });
      expect(html).toContain("London");
      expect(html).toContain("mailto:jane@example.com");
      expect(html).toContain("GitHub");
    });
  });

  describe("linkifyPlainContact", () => {
    it("linkifies known labels from profile", () => {
      const html = linkifyPlainContact("GitHub | Portfolio", {
        github: "https://github.com/jane",
        portfolio: "https://jane.dev",
      });
      expect(html).toContain("<a href=");
      expect(html).toContain("GitHub");
    });
  });

  describe("plainTextToSummaryHtml", () => {
    it("wraps plain text in paragraph tags", () => {
      expect(plainTextToSummaryHtml("Hello world")).toContain("<p>");
    });
  });
});
