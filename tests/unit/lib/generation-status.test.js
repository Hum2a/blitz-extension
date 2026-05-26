import { describe, expect, it } from "vitest";
import jobs from "../../fixtures/jobs.json" with { type: "json" };
import {
  activeGenerationStatus,
  failedGenerationStatus,
  idleGenerationStatus,
  snapshotJobForGeneration,
} from "../../../popup/src/lib/generation-status.js";

describe("generation-status", () => {
  it("idle status is inactive", () => {
    expect(idleGenerationStatus()).toEqual({ active: false });
  });

  it("snapshots only generation-relevant job fields", () => {
    const snap = snapshotJobForGeneration({
      ...jobs.greenhouse,
      extra: "ignored",
      listingKey: "k1",
    });
    expect(snap.jobTitle).toBe("Senior Engineer");
    expect(snap.extra).toBeUndefined();
  });

  it("active status includes progress and source", () => {
    const status = activeGenerationStatus(jobs.linkedin, { percent: 10 }, "popup");
    expect(status.active).toBe(true);
    expect(status.source).toBe("popup");
    expect(status.company).toBe("Beta Ltd");
    expect(status.progress.percent).toBe(10);
  });

  it("failed status captures error", () => {
    const status = failedGenerationStatus("API key missing");
    expect(status.active).toBe(false);
    expect(status.error).toMatch(/API key/);
  });
});
