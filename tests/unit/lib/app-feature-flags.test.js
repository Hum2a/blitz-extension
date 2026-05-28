import { describe, expect, it } from "vitest";
import {
  FEATURE_FLAGS,
  isFeatureDisabled,
  isFeatureEnabled,
} from "../../../popup/src/lib/app-feature-flags.js";

describe("app-feature-flags", () => {
  it("defaults unknown flags to enabled", () => {
    expect(isFeatureEnabled({}, FEATURE_FLAGS.DISABLE_GENERATION)).toBe(true);
    expect(isFeatureDisabled({}, FEATURE_FLAGS.DISABLE_QUEUE)).toBe(false);
  });

  it("treats true as disabled for disable_* keys", () => {
    expect(isFeatureDisabled({ disable_generation: true }, "disable_generation")).toBe(true);
    expect(isFeatureEnabled({ disable_generation: true }, "disable_generation")).toBe(false);
    expect(isFeatureDisabled({ disable_queue: false }, "disable_queue")).toBe(false);
  });
});
