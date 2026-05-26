import { describe, it, expect } from "vitest";
import {
  isEmailRateLimitError,
  rateLimitCooldownMs,
} from "../../../popup/src/lib/auth-errors.js";

describe("auth-errors", () => {
  it("detects rate limit messages", () => {
    expect(isEmailRateLimitError(new Error("email rate limit exceeded"))).toBe(true);
    expect(isEmailRateLimitError(new Error("ok"))).toBe(false);
  });

  it("uses longer cooldown when exceeded", () => {
    expect(rateLimitCooldownMs(new Error("email rate limit exceeded"))).toBe(3_600_000);
    expect(rateLimitCooldownMs(new Error("slow down"))).toBe(60_000);
  });
});
