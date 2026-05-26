import { describe, expect, it } from "vitest";
import { isSessionExpired } from "../../../popup/src/lib/auth.js";

describe("auth", () => {
  describe("isSessionExpired", () => {
    it("returns true without session", () => {
      expect(isSessionExpired(null)).toBe(true);
      expect(isSessionExpired({})).toBe(true);
    });

    it("returns false when expiry is in the future", () => {
      const session = { expires_at: Date.now() + 3600_000 };
      expect(isSessionExpired(session)).toBe(false);
    });

    it("returns true within 60s buffer of expiry", () => {
      const session = { expires_at: Date.now() + 30_000 };
      expect(isSessionExpired(session)).toBe(true);
    });
  });
});
