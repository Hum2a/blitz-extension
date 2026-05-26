import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_APPEARANCE,
  getThemeVars,
  resolveMode,
} from "../../../popup/src/lib/theme-runtime.js";

describe("theme-runtime", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("resolveMode", () => {
    it("returns explicit light/dark", () => {
      expect(resolveMode("light")).toBe("light");
      expect(resolveMode("dark")).toBe("dark");
    });

    it("follows prefers-color-scheme when system", () => {
      vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true });
      expect(resolveMode("system")).toBe("dark");
      vi.spyOn(window, "matchMedia").mockReturnValue({ matches: false });
      expect(resolveMode("system")).toBe("light");
    });
  });

  describe("getThemeVars", () => {
    it("returns light palette for light mode", () => {
      const vars = getThemeVars("blitz", "light");
      expect(vars["--page-bg"] || vars["--slate-50"]).toBeTruthy();
    });

    it("falls back to default theme for invalid id", () => {
      const vars = getThemeVars("invalid", "light");
      const defaultVars = getThemeVars(DEFAULT_APPEARANCE.theme, "light");
      expect(vars).toEqual(defaultVars);
    });
  });
});
