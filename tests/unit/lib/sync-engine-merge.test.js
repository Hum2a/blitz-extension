import { describe, expect, it } from "vitest";
import { compareUpdatedAt, pickWinner } from "../../../popup/src/lib/sync-engine.js";

describe("sync-engine merge helpers", () => {
  describe("compareUpdatedAt", () => {
    it("orders newer timestamps first", () => {
      expect(compareUpdatedAt("2026-01-02T00:00:00Z", "2026-01-01T00:00:00Z")).toBe(1);
      expect(compareUpdatedAt("2026-01-01T00:00:00Z", "2026-01-02T00:00:00Z")).toBe(-1);
      expect(compareUpdatedAt("2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z")).toBe(0);
    });
  });

  describe("pickWinner", () => {
    it("prefers newer updated_at", () => {
      expect(
        pickWinner("2026-05-02T12:00:00Z", "2026-05-01T12:00:00Z", "a", "b")
      ).toBe("local");
      expect(
        pickWinner("2026-05-01T12:00:00Z", "2026-05-02T12:00:00Z", "a", "b")
      ).toBe("remote");
    });

    it("breaks ties by device id", () => {
      expect(
        pickWinner("2026-05-01T12:00:00Z", "2026-05-01T12:00:00Z", "device-b", "device-a")
      ).toBe("local");
      expect(
        pickWinner("2026-05-01T12:00:00Z", "2026-05-01T12:00:00Z", "device-a", "device-b")
      ).toBe("remote");
    });
  });
});
