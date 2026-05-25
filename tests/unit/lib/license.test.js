import { beforeEach, describe, expect, it, vi } from "vitest";
import { seedStorage } from "../../helpers/fake-storage.js";
import {
  canSubmitApplication,
  checkLicenseStatus,
  FREE_APPLICATION_LIMIT,
  incrementApplicationCount,
  validateLicense,
} from "../../../popup/src/lib/license.js";

describe("license", () => {
  beforeEach(() => {
    seedStorage({ license: { key: "", tier: "free", applicationsUsed: 0 } });
    vi.stubGlobal("fetch", vi.fn());
  });

  describe("validateLicense", () => {
    it("returns server JSON on success", async () => {
      fetch.mockResolvedValue({
        json: async () => ({ valid: true, tier: "pro", message: "OK" }),
      });
      const result = await validateLicense("BLITZ-TEST");
      expect(result.valid).toBe(true);
      expect(result.tier).toBe("pro");
    });

    it("handles network failure", async () => {
      fetch.mockRejectedValue(new Error("offline"));
      const result = await validateLicense("x");
      expect(result.valid).toBe(false);
      expect(result.message).toMatch(/license server/i);
    });
  });

  describe("canSubmitApplication", () => {
    it("allows pro tier without limit", async () => {
      seedStorage({
        license: {
          key: "pro-key",
          tier: "pro",
          validatedAt: new Date().toISOString(),
          applicationsUsed: 99,
        },
      });
      const { allowed, remaining } = await canSubmitApplication();
      expect(allowed).toBe(true);
      expect(remaining).toBe(Infinity);
    });

    it("enforces free tier limit", async () => {
      seedStorage({
        license: { applicationsUsed: FREE_APPLICATION_LIMIT },
      });
      const { allowed, remaining } = await canSubmitApplication();
      expect(allowed).toBe(false);
      expect(remaining).toBe(0);
    });
  });

  describe("incrementApplicationCount", () => {
    it("increments stored counter", async () => {
      const count = await incrementApplicationCount();
      expect(count).toBe(1);
      const license = await import("../../../popup/src/lib/storage.js").then((m) =>
        m.getStorage("license")
      );
      expect(license.applicationsUsed).toBe(1);
    });
  });

  describe("checkLicenseStatus", () => {
    it("returns free tier when no key stored", async () => {
      const status = await checkLicenseStatus();
      expect(status.tier).toBe("free");
      expect(status.valid).toBe(false);
    });
  });
});
