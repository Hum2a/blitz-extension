import { describe, expect, it } from "vitest";
import { isSiteLayout, scrollPanelClass } from "../../../popup/src/lib/layout.js";

describe("layout", () => {
  it("detects full-page layout", () => {
    expect(isSiteLayout(true)).toBe(true);
    expect(isSiteLayout(false)).toBe(false);
  });

  it("returns scroll class only in popup mode", () => {
    expect(scrollPanelClass(false)).toContain("overflow-y-auto");
    expect(scrollPanelClass(true)).toBe("");
  });
});
