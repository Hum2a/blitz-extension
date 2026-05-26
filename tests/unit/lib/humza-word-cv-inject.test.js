import { describe, expect, it } from "vitest";
import {
  isHumzaWordCvTemplate,
  templateHasMustacheVariables,
} from "../../../popup/src/lib/humza-word-cv-inject.js";

describe("humza-word-cv-inject", () => {
  describe("templateHasMustacheVariables", () => {
    it("detects mustache tags", () => {
      expect(templateHasMustacheVariables("<p>{{fullName}}</p>")).toBe(true);
      expect(templateHasMustacheVariables("{{#jobs}}")).toBe(true);
      expect(templateHasMustacheVariables("<p>Plain HTML</p>")).toBe(false);
    });
  });

  describe("isHumzaWordCvTemplate", () => {
    it("identifies Word export without mustache", () => {
      const wordHtml = `
        <p>Professional Summary</p>
        <p>Technical Skills</p>
        <p>Education</p>
        <p>Career (portfolio)</p>
      `;
      expect(isHumzaWordCvTemplate(wordHtml)).toBe(true);
    });

    it("rejects mustache templates", () => {
      expect(isHumzaWordCvTemplate("<p>{{fullName}}</p> Professional Summary")).toBe(
        false
      );
    });
  });
});
