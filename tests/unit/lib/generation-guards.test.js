import { beforeEach, describe, expect, it, vi } from "vitest";
import { seedStorage } from "../../helpers/fake-storage.js";
import { assertGenerationAllowed } from "../../../popup/src/lib/generation-guards.js";

vi.mock("../../../popup/src/lib/app-config.js", () => ({
  fetchAppConfig: vi.fn(),
}));

vi.mock("../../../popup/src/lib/license.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    canSubmitApplication: vi.fn(),
  };
});

import { fetchAppConfig } from "../../../popup/src/lib/app-config.js";
import { canSubmitApplication } from "../../../popup/src/lib/license.js";

describe("generation-guards", () => {
  beforeEach(() => {
    seedStorage({
      cv_text: "CV",
      preferences: { dailyLimit: 25 },
      license: { tier: "free" },
    });
    fetchAppConfig.mockResolvedValue({
      maintenance_mode: false,
      feature_flags: {},
    });
    canSubmitApplication.mockResolvedValue({ allowed: true, remaining: 5 });
  });

  it("blocks maintenance mode", async () => {
    fetchAppConfig.mockResolvedValue({ maintenance_mode: true, feature_flags: {} });
    await expect(assertGenerationAllowed()).rejects.toThrow(/maintenance/i);
  });

  it("blocks when disable_generation flag is set", async () => {
    fetchAppConfig.mockResolvedValue({
      maintenance_mode: false,
      feature_flags: { disable_generation: true },
    });
    await expect(assertGenerationAllowed({ action: "generate" })).rejects.toThrow(
      /temporarily disabled/i
    );
  });

  it("allows when checks pass", async () => {
    await expect(assertGenerationAllowed()).resolves.toMatchObject({ daily: expect.any(Object) });
  });
});
