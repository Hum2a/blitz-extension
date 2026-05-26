import { describe, expect, it } from "vitest";
import {
  DEFAULT_THEME_ID,
  THEME_CATALOG,
  THEMES,
  isValidThemeId,
} from "../../../popup/src/lib/themes.js";

describe("themes", () => {
  it("catalog ids match THEMES keys", () => {
    for (const t of THEME_CATALOG) {
      expect(THEMES[t.id]).toBeDefined();
      expect(THEMES[t.id].light).toBeDefined();
      expect(THEMES[t.id].dark).toBeDefined();
    }
  });

  it("validates theme ids", () => {
    expect(isValidThemeId(DEFAULT_THEME_ID)).toBe(true);
    expect(isValidThemeId("not-a-theme")).toBe(false);
  });

  it("theme vars use RGB channel format", () => {
    const vars = THEMES.blitz.light;
    expect(vars["--blitz-500"]).toMatch(/^\d+ \d+ \d+$/);
  });
});
