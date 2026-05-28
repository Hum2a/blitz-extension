import { describe, expect, it } from "vitest";
import {
  buildWorkdaySummary,
  summarizeWorkdayDiagnostics,
  workdaySuggestionsForPhase,
} from "../../../popup/src/lib/workday-fill-diagnostics.js";

const sampleReport = {
  platform: "workday",
  mode: "fill",
  pagePhase: "apply_form",
  fields: [
    { id: "email", label: "Email", status: "filled" },
    { id: "phone", label: "Phone", status: "missing" },
  ],
  screening: { expected: 2, matched: 1, unmatched: ["Visa sponsorship?"] },
  resume: { fileInputFound: true, status: "pdf_attached" },
};

describe("workday-fill-diagnostics", () => {
  it("summarizeWorkdayDiagnostics counts filled and ready state", () => {
    const summary = summarizeWorkdayDiagnostics(sampleReport);
    expect(summary.filled).toBe(1);
    expect(summary.found).toBe(1);
    expect(summary.total).toBe(2);
    expect(summary.ready).toBe(true);
  });

  it("buildWorkdaySummary includes screening and resume", () => {
    const text = buildWorkdaySummary(sampleReport);
    expect(text).toContain("1/2 screening");
    expect(text).toContain("resume: pdf_attached");
  });

  it("workdaySuggestionsForPhase returns tips per phase", () => {
    expect(workdaySuggestionsForPhase("job_posting").length).toBeGreaterThan(0);
    expect(workdaySuggestionsForPhase("apply_form").length).toBeGreaterThan(0);
  });
});
