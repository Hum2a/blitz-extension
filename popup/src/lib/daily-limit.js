import { getStorage, setStorage } from "./storage.js";
import { checkLicenseStatus } from "./license.js";

const USAGE_KEY = "daily_application_usage";

export function todayDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export async function getDailyUsage() {
  const stored = (await getStorage(USAGE_KEY)) || {};
  const today = todayDateKey();
  if (stored.date !== today) {
    return { date: today, count: 0 };
  }
  return { date: today, count: Number(stored.count) || 0 };
}

export async function incrementDailyUsage() {
  const usage = await getDailyUsage();
  const next = { date: usage.date, count: usage.count + 1 };
  await setStorage(USAGE_KEY, next);
  return next.count;
}

/**
 * Soft daily cap (preferences.dailyLimit). Pro tier bypasses. 0 or negative = unlimited.
 */
export async function canGenerateToday(preferences = {}) {
  const status = await checkLicenseStatus();
  if (status.tier === "pro" && status.valid) {
    return { allowed: true, remaining: Infinity, limit: null, used: 0 };
  }

  const limit = Number(preferences?.dailyLimit);
  if (!Number.isFinite(limit) || limit <= 0) {
    return { allowed: true, remaining: Infinity, limit: null, used: 0 };
  }

  const usage = await getDailyUsage();
  const used = usage.count;
  const remaining = Math.max(0, limit - used);
  return {
    allowed: remaining > 0,
    remaining,
    limit,
    used,
  };
}
