import { describe, expect, it } from "vitest";
import {
  humanizeGeneratedText,
  stripEmDashes,
} from "../../../popup/src/lib/humanize-text.js";

describe("humanize-text", () => {
  describe("stripEmDashes", () => {
    it("replaces em dashes with commas", () => {
      expect(stripEmDashes("Led teams\u2014delivered results")).toBe(
        "Led teams, delivered results"
      );
    });

    it("preserves en dashes in date ranges", () => {
      expect(stripEmDashes("2020\u20132024")).toBe("2020\u20132024");
    });

    it("passes through non-strings", () => {
      expect(stripEmDashes(null)).toBe(null);
      expect(stripEmDashes(42)).toBe(42);
    });
  });

  describe("humanizeGeneratedText", () => {
    it("recursively humanizes nested objects", () => {
      const input = {
        title: "A\u2014B",
        items: ["x\u2014y"],
        nested: { note: "one\u2014two" },
      };
      const out = humanizeGeneratedText(input);
      expect(out.title).toBe("A, B");
      expect(out.items[0]).toBe("x, y");
      expect(out.nested.note).toBe("one, two");
    });
  });
});
