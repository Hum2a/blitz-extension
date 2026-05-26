import { getStorage, mergeStorage } from "./storage.js";
import {
  isSyncableStorageKey,
  SYNCABLE_USER_SETTINGS_KEYS,
} from "./sync-payload.js";

const DEFAULT_SYNC_STATE = {
  deviceId: null,
  lastPulledAt: null,
  lastSyncAt: null,
  lastError: null,
  documents: {},
  pendingDocKeys: [],
  pendingApplicationIds: [],
  pendingOps: [],
};

export async function ensureDeviceId() {
  const state = (await getStorage("sync_state")) || {};
  if (state.deviceId) return state.deviceId;
  const deviceId = crypto.randomUUID();
  await mergeStorage(
    {
      sync_state: { ...DEFAULT_SYNC_STATE, ...state, deviceId },
    },
    { skipSync: true }
  );
  return deviceId;
}

/** Queue every local application for upload (e.g. after sync enable or backfill). */
export async function markAllApplicationsPending() {
  const syncEnabled = await getStorage("sync_enabled");
  if (!syncEnabled) return { count: 0 };

  const { getAllApplications } = await import("./db.js");
  const apps = await getAllApplications();
  if (!apps.length) return { count: 0 };

  const state = { ...DEFAULT_SYNC_STATE, ...((await getStorage("sync_state")) || {}) };
  const pending = new Set(state.pendingApplicationIds || []);
  for (const app of apps) {
    if (app?.id) pending.add(app.id);
  }
  state.pendingApplicationIds = [...pending];
  await mergeStorage({ sync_state: state }, { skipSync: true });

  try {
    chrome.runtime.sendMessage({ type: "SYNC_SCHEDULE_PUSH" }).catch(() => {});
  } catch {
    /* ignore */
  }

  return { count: apps.length };
}

/** Queue every user setting for upload (e.g. after first sync enable). */
export async function markAllSettingsPending() {
  const syncEnabled = await getStorage("sync_enabled");
  if (!syncEnabled) return;

  const state = { ...DEFAULT_SYNC_STATE, ...((await getStorage("sync_state")) || {}) };
  const pending = new Set(state.pendingDocKeys || []);
  for (const key of SYNCABLE_USER_SETTINGS_KEYS) {
    pending.add(key);
    state.documents = state.documents || {};
    state.documents[key] = {
      ...(state.documents[key] || {}),
      pendingPush: true,
      localUpdatedAt: new Date().toISOString(),
    };
  }
  state.pendingDocKeys = [...pending];
  await mergeStorage({ sync_state: state }, { skipSync: true });

  try {
    chrome.runtime.sendMessage({ type: "SYNC_SCHEDULE_PUSH" }).catch(() => {});
  } catch {
    /* ignore */
  }
}

export async function markStorageKeyPending(key) {
  if (!isSyncableStorageKey(key)) return;
  const syncEnabled = await getStorage("sync_enabled");
  if (!syncEnabled) return;

  const state = { ...DEFAULT_SYNC_STATE, ...((await getStorage("sync_state")) || {}) };
  const pending = new Set(state.pendingDocKeys || []);
  pending.add(key);
  state.pendingDocKeys = [...pending];
  state.documents = state.documents || {};
  state.documents[key] = {
    ...(state.documents[key] || {}),
    pendingPush: true,
    localUpdatedAt: new Date().toISOString(),
  };

  await mergeStorage({ sync_state: state }, { skipSync: true });

  try {
    chrome.runtime.sendMessage({ type: "SYNC_SCHEDULE_PUSH" }).catch(() => {});
  } catch {
    /* non-extension context */
  }
}

export async function markApplicationPending(id) {
  const syncEnabled = await getStorage("sync_enabled");
  if (!syncEnabled || !id) return;

  const state = { ...DEFAULT_SYNC_STATE, ...((await getStorage("sync_state")) || {}) };
  const pending = new Set(state.pendingApplicationIds || []);
  pending.add(id);
  state.pendingApplicationIds = [...pending];

  await mergeStorage({ sync_state: state }, { skipSync: true });

  try {
    chrome.runtime.sendMessage({ type: "SYNC_SCHEDULE_PUSH" }).catch(() => {});
  } catch {
    /* ignore */
  }
}

export async function markApplicationDeleted(id) {
  const syncEnabled = await getStorage("sync_enabled");
  if (!syncEnabled || !id) return;

  const state = { ...DEFAULT_SYNC_STATE, ...((await getStorage("sync_state")) || {}) };
  state.pendingOps = [
    ...(state.pendingOps || []),
    { type: "delete_application", id, at: new Date().toISOString() },
  ];
  await mergeStorage({ sync_state: state }, { skipSync: true });

  try {
    chrome.runtime.sendMessage({ type: "SYNC_SCHEDULE_PUSH" }).catch(() => {});
  } catch {
    /* ignore */
  }
}
