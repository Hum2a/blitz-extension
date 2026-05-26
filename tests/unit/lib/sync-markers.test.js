import { beforeEach, describe, expect, it, vi } from "vitest";
import { seedStorage, readStorage } from "../../helpers/fake-storage.js";
import {
  ensureDeviceId,
  markAllApplicationsPending,
  markStorageKeyPending,
} from "../../../popup/src/lib/sync-markers.js";

vi.mock("../../../popup/src/lib/db.js", () => ({
  getAllApplications: vi.fn(async () => [
    { id: "11111111-1111-4111-8111-111111111111", updatedAt: "2025-01-01T00:00:00.000Z" },
    { id: "22222222-2222-4222-8222-222222222222", updatedAt: "2025-01-02T00:00:00.000Z" },
  ]),
}));

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
    await markStorageKeyPending("auth_session");
    const state = readStorage("sync_state") || {};
    expect(state.pendingDocKeys || []).not.toContain("auth_session");
  });

  it("no-ops when sync disabled", async () => {
    seedStorage({ sync_enabled: false });
    await markStorageKeyPending("cv_text");
    expect(readStorage("sync_state")).toBeUndefined();
  });

  it("queues all local applications when sync enabled", async () => {
    const { count } = await markAllApplicationsPending();
    expect(count).toBe(2);
    const state = readStorage("sync_state");
    expect(state.pendingApplicationIds).toContain("11111111-1111-4111-8111-111111111111");
    expect(state.pendingApplicationIds).toContain("22222222-2222-4222-8222-222222222222");
  });
});
