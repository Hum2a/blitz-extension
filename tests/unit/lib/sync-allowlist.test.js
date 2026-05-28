import { describe, expect, it } from "vitest";
import {
  isSyncableStorageKey,
  LOCAL_ONLY_STORAGE_KEYS,
  SYNCABLE_STORAGE_KEYS,
  prepareForCloud,
  mergeFromCloud,
} from "../../../popup/src/lib/sync-payload.js";

describe("sync-payload", () => {
  it("syncs all user settings keys except ephemeral state", () => {
    expect(SYNCABLE_STORAGE_KEYS.has("preferences")).toBe(true);
    expect(SYNCABLE_STORAGE_KEYS.has("appearance")).toBe(true);
    expect(SYNCABLE_STORAGE_KEYS.has("ai_config")).toBe(true);
    expect(SYNCABLE_STORAGE_KEYS.has("license")).toBe(true);
    expect(SYNCABLE_STORAGE_KEYS.has("job_queue")).toBe(true);
    expect(SYNCABLE_STORAGE_KEYS.has("pending_job")).toBe(true);
    expect(LOCAL_ONLY_STORAGE_KEYS.has("pending_application")).toBe(true);
    expect(LOCAL_ONLY_STORAGE_KEYS.has("auth_session")).toBe(true);
  });

  it("strips application bodies from job_queue for cloud", () => {
    const cloud = prepareForCloud("job_queue", [
      {
        id: "1",
        url: "https://example.com/job",
        platform: "greenhouse",
        status: "ready",
        application: { tailoredCV: "secret cv" },
        jobData: { jobTitle: "Dev", company: "Acme", url: "https://example.com/job" },
      },
    ]);
    expect(cloud[0].application).toBeUndefined();
    expect(cloud[0].jobData.jobTitle).toBe("Dev");
  });

  it("strips apiKey from ai_config for cloud", () => {
    const cloud = prepareForCloud("ai_config", {
      provider: "openai",
      model: "gpt-4o",
      apiKey: "secret",
    });
    expect(cloud).toEqual({ provider: "openai", model: "gpt-4o" });
    expect(cloud.apiKey).toBeUndefined();
  });

  it("strips license key but keeps tier for cloud", () => {
    const cloud = prepareForCloud("license", {
      key: "BLITZ-SECRET",
      tier: "pro",
      applicationsUsed: 3,
    });
    expect(cloud.key).toBeUndefined();
    expect(cloud.tier).toBe("pro");
    expect(cloud.applicationsUsed).toBe(3);
  });

  it("mergeFromCloud preserves local apiKey and license key", () => {
    const merged = mergeFromCloud(
      "ai_config",
      { provider: "anthropic", apiKey: "local-key", model: "old" },
      { provider: "openai", model: "gpt-4o" }
    );
    expect(merged.apiKey).toBe("local-key");
    expect(merged.provider).toBe("openai");
    expect(merged.model).toBe("gpt-4o");
  });

  it("rejects unknown keys", () => {
    expect(isSyncableStorageKey("pending_application")).toBe(false);
    expect(isSyncableStorageKey("unknown_key")).toBe(false);
  });
});
