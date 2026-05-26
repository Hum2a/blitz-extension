import { beforeEach, describe, expect, it } from "vitest";
import { seedStorage, readStorage } from "../../helpers/fake-storage.js";
import {
  ensureDeviceId,
  markStorageKeyPending,
} from "../../../popup/src/lib/sync-markers.js";

describe("sync-markers", () => {
  beforeEach(() => {
    seedStorage({ sync_enabled: true });
  });

  it("creates device id when missing", async () => {
    const id = await ensureDeviceId();
    expect(id).toMatch(/^[0-9a-f-]{36}$/i);
    const state = readStorage("sync_state");
    expect(state.deviceId).toBe(id);
  });

  it("reuses existing device id", async () => {
    seedStorage({ sync_state: { deviceId: "device-abc" } });
    expect(await ensureDeviceId()).toBe("device-abc");
  });

  it("queues syncable storage keys when sync enabled", async () => {
    await markStorageKeyPending("cv_text");
    const state = readStorage("sync_state");
    expect(state.pendingDocKeys).toContain("cv_text");
    expect(state.documents.cv_text.pendingPush).toBe(true);
  });

  it("ignores non-syncable keys", async () => {
    await markStorageKeyPending("ai_config");
    const state = readStorage("sync_state") || {};
    expect(state.pendingDocKeys || []).not.toContain("ai_config");
  });

  it("no-ops when sync disabled", async () => {
    seedStorage({ sync_enabled: false });
    await markStorageKeyPending("cv_text");
    expect(readStorage("sync_state")).toBeUndefined();
  });
});
