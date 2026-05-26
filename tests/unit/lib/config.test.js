import { describe, expect, it } from "vitest";
import {
  LICENSE_ENDPOINT,
  LEMONSQUEEZY,
  SUPABASE_CONFIGURED,
} from "../../../popup/src/lib/config.js";

describe("config", () => {
  it("exposes license endpoint URL", () => {
    expect(LICENSE_ENDPOINT).toMatch(/^https:\/\//);
  });

  it("exposes LemonSqueezy checkout URLs", () => {
    expect(LEMONSQUEEZY.checkoutMonthly).toMatch(/lemonsqueezy/i);
  });

  it("SUPABASE_CONFIGURED is false when env not set in repo", () => {
    expect(SUPABASE_CONFIGURED).toBe(false);
  });
});
