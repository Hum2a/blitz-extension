import { describe, expect, it } from "vitest";
import {
  followUpAtFromDays,
  formatFollowUpAt,
} from "../../../popup/src/lib/follow-up-reminders.js";

describe("follow-up-reminders", () => {
  it("followUpAtFromDays returns ISO at 9am local", () => {
    const iso = followUpAtFromDays(1);
    const d = new Date(iso);
    expect(d.getHours()).toBe(9);
    expect(d.getMinutes()).toBe(0);
  });

  it("formatFollowUpAt labels near dates", () => {
    const tomorrow = followUpAtFromDays(1);
    expect(formatFollowUpAt(tomorrow)).toBe("Tomorrow");
  });
});
