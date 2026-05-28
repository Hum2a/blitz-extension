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
    expect(LEMONSQUEEZY.customerPortal).toMatch(/billing/i);
  });

  it("SUPABASE_CONFIGURED reflects .env via config.secrets.js (boolean)", () => {
    expect(typeof SUPABASE_CONFIGURED).toBe("boolean");
  });
});
