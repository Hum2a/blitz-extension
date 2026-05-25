import { describe, expect, it } from "vitest";
import {
  isSyncableStorageKey,
  LOCAL_ONLY_STORAGE_KEYS,
  SYNCABLE_STORAGE_KEYS,
} from "../../../popup/src/lib/sync-allowlist.js";

describe("sync-allowlist", () => {
  it("never syncs API keys or pending state", () => {
    expect(LOCAL_ONLY_STORAGE_KEYS.has("ai_config")).toBe(true);
    expect(LOCAL_ONLY_STORAGE_KEYS.has("pending_job")).toBe(true);
    expect(SYNCABLE_STORAGE_KEYS.has("ai_config")).toBe(false);
  });

  it("allows profile and preferences sync", () => {
    expect(isSyncableStorageKey("cv_text")).toBe(true);
    expect(isSyncableStorageKey("preferences")).toBe(true);
    expect(isSyncableStorageKey("ai_config")).toBe(false);
    expect(isSyncableStorageKey("unknown_key")).toBe(false);
  });
});
