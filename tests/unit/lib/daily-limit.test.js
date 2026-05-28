import { beforeEach, describe, expect, it, vi } from "vitest";
import { seedStorage } from "../../helpers/fake-storage.js";
import {
  canGenerateToday,
  getDailyUsage,
  incrementDailyUsage,
  todayDateKey,
} from "../../../popup/src/lib/daily-limit.js";

describe("daily-limit", () => {
  beforeEach(() => {
    seedStorage({ license: { tier: "free", applicationsUsed: 0 } });
    vi.stubGlobal("fetch", vi.fn());
  });

  it("tracks usage per calendar day", async () => {
    expect(await getDailyUsage()).toEqual({ date: todayDateKey(), count: 0 });
    await incrementDailyUsage();
    await incrementDailyUsage();
    expect((await getDailyUsage()).count).toBe(2);
  });

  it("enforces preferences.dailyLimit on free tier", async () => {
    seedStorage({
      license: { tier: "free" },
      daily_application_usage: { date: todayDateKey(), count: 25 },
      preferences: { dailyLimit: 25 },
    });
    const result = await canGenerateToday({ dailyLimit: 25 });
    expect(result.allowed).toBe(false);
    expect(result.used).toBe(25);
  });

  it("bypasses daily limit for pro", async () => {
    seedStorage({
      license: { tier: "pro", validatedAt: new Date().toISOString() },
      daily_application_usage: { date: todayDateKey(), count: 99 },
      preferences: { dailyLimit: 5 },
    });
    const result = await canGenerateToday({ dailyLimit: 5 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(Infinity);
  });

  it("treats dailyLimit 0 as unlimited", async () => {
    seedStorage({
      license: { tier: "free" },
      daily_application_usage: { date: todayDateKey(), count: 50 },
      preferences: { dailyLimit: 0 },
    });
    const result = await canGenerateToday({ dailyLimit: 0 });
    expect(result.allowed).toBe(true);
  });
});
