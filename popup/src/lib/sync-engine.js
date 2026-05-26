import { getStorage, setStorage, mergeStorage, getAllSettings } from "./storage.js";
import { getValidAccessToken } from "./auth.js";
import {
  SYNCABLE_STORAGE_KEYS,
  SYNCABLE_USER_SETTINGS_KEYS,
  serializeForCloud,
  mergeFromCloud,
  prepareForCloud,
} from "./sync-payload.js";
import { encryptPayload, decryptPayload, hashForSync } from "./e2ee-crypto.js";
import { ensureDeviceId, markStorageKeyPending } from "./sync-markers.js";
import {
  restSelect,
  restUpsert,
  restDelete,
  invokeEdgeFunction,
  SUPABASE_CONFIGURED,
} from "./supabase-client.js";
import {
  getAllApplications,
  addApplication,
  updateApplication,
  deleteApplication,
} from "./db.js";

const PUSH_DEBOUNCE_MS = 3000;
const BATCH_SIZE = 50;

let pushTimer = null;
let pushInFlight = false;

function compareUpdatedAt(a, b) {
  const ta = new Date(a || 0).getTime();
  const tb = new Date(b || 0).getTime();
  if (ta !== tb) return ta > tb ? 1 : -1;
  return 0;
}

function pickWinner(localAt, remoteAt, localDevice, remoteDevice) {
  const cmp = compareUpdatedAt(localAt, remoteAt);
  if (cmp > 0) return "local";
  if (cmp < 0) return "remote";
  return (localDevice || "") >= (remoteDevice || "") ? "local" : "remote";
}

async function updateSyncState(patch) {
  const prev = (await getStorage("sync_state")) || {};
  await mergeStorage({ sync_state: { ...prev, ...patch } }, { skipSync: true });
}

async function requireSyncReady(passphrase) {
  if (!SUPABASE_CONFIGURED) throw new Error("Cloud sync is not configured");
  const syncEnabled = await getStorage("sync_enabled");
  if (!syncEnabled) throw new Error("Cloud sync is disabled");
  const meta = await getStorage("sync_crypto_meta");
  if (!meta?.salt) throw new Error("Set up sync encryption first");
  const unlocked = await getStorage("sync_unlocked");
  if (!unlocked && !passphrase) {
    throw new Error("Enter your sync passphrase to continue");
  }
  const token = await getValidAccessToken();
  if (!token) throw new Error("Sign in to sync");
  return { token, meta, passphrase };
}

export async function enableCloudSync({ passphrase, rememberOnDevice = true }) {
  const { setupSyncCrypto, unlockSyncCrypto } = await import("./e2ee-crypto.js");
  let meta = await getStorage("sync_crypto_meta");
  if (!meta?.salt) {
    meta = await setupSyncCrypto(passphrase);
    await setStorage("sync_crypto_meta", meta, { skipSync: true });
  } else {
    await unlockSyncCrypto(passphrase, meta);
  }
  await setStorage("sync_enabled", true, { skipSync: true });
  await setStorage("sync_unlocked", rememberOnDevice, { skipSync: true });
  await ensureDeviceId();
  await pullCloudSync({ passphrase });
  const { markAllSettingsPending } = await import("./sync-markers.js");
  await markAllSettingsPending();
  await schedulePush();
  return { ok: true };
}

export async function unlockCloudSync(passphrase, rememberOnDevice = true) {
  const meta = await getStorage("sync_crypto_meta");
  const { unlockSyncCrypto } = await import("./e2ee-crypto.js");
  await unlockSyncCrypto(passphrase, meta);
  await setStorage("sync_unlocked", rememberOnDevice, { skipSync: true });
  return { ok: true };
}

export function schedulePush() {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    pushCloudSync().catch((err) => {
      updateSyncState({
        lastError: err.message,
        lastSyncAt: new Date().toISOString(),
      });
    });
  }, PUSH_DEBOUNCE_MS);
  return Promise.resolve();
}

async function upsertUserSyncMeta(token) {
  const userId = (await getStorage("auth_session"))?.user?.id;
  if (!userId) return;
  await restUpsert(
    "user_sync_meta",
    token,
    {
      user_id: userId,
      schema_version: 2,
      encryption_version: "v1",
      last_full_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

export async function pushCloudSync({ passphrase } = {}) {
  if (!SUPABASE_CONFIGURED || pushInFlight) return { skipped: true };
  const { token, meta, passphrase: pp } = await requireSyncReady(passphrase);
  pushInFlight = true;
  const deviceId = await ensureDeviceId();
  const state = (await getStorage("sync_state")) || {};
  const pendingKeys = [
    ...new Set([
      ...(state.pendingDocKeys || []),
      ...[...SYNCABLE_STORAGE_KEYS].filter((k) => state.documents?.[k]?.pendingPush),
    ]),
  ];

  try {
    const rows = [];
    for (const key of pendingKeys) {
      const value = await getStorage(key);
      const serialized = serializeForCloud(key, value);
      const content_hash = await hashForSync(serialized);
      const docMeta = state.documents?.[key] || {};
      if (docMeta.hash === content_hash && !docMeta.pendingPush) continue;

      const ciphertext = await encryptPayload(serialized, {
        passphrase: pp,
        syncCryptoMeta: meta,
      });
      const userId = (await getStorage("auth_session"))?.user?.id;
      rows.push({
        user_id: userId,
        doc_key: key,
        ciphertext,
        content_hash,
        updated_at: docMeta.localUpdatedAt || new Date().toISOString(),
        device_id: deviceId,
        deleted_at: null,
      });
    }

    if (rows.length) {
      await restUpsert("sync_documents", token, rows, { onConflict: "user_id,doc_key" });
    }

    await pushApplications(token, meta, pp, deviceId, state);
    await processPendingOps(token, deviceId);

    const nextDocs = { ...(state.documents || {}) };
    for (const key of pendingKeys) {
      const value = await getStorage(key);
      const serialized = serializeForCloud(key, value);
      nextDocs[key] = {
        ...(nextDocs[key] || {}),
        hash: await hashForSync(serialized),
        pendingPush: false,
        localUpdatedAt: nextDocs[key]?.localUpdatedAt || new Date().toISOString(),
      };
    }

    await updateSyncState({
      pendingDocKeys: [],
      documents: nextDocs,
      lastSyncAt: new Date().toISOString(),
      lastError: null,
    });
    await upsertUserSyncMeta(token);
    return { ok: true, pushed: rows.length };
  } catch (err) {
    await updateSyncState({
      lastError: err.message,
      lastSyncAt: new Date().toISOString(),
    });
    throw err;
  } finally {
    pushInFlight = false;
  }
}

async function pushApplications(token, meta, passphrase, deviceId, state) {
  const pendingIds = new Set(state.pendingApplicationIds || []);
  if (!pendingIds.size) return;

  const apps = await getAllApplications();
  const rows = [];
  for (const app of apps) {
    if (!pendingIds.has(app.id)) continue;
    const serialized = JSON.stringify(app);
    const content_hash = await hashForSync(serialized);
    const ciphertext = await encryptPayload(serialized, { passphrase, syncCryptoMeta: meta });
    rows.push({
      id: app.id,
      user_id: (await getStorage("auth_session"))?.user?.id,
      ciphertext,
      content_hash,
      updated_at: app.updatedAt || app.generatedAt || new Date().toISOString(),
      device_id: deviceId,
      deleted_at: null,
    });
  }

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    await restUpsert("synced_applications", token, rows.slice(i, i + BATCH_SIZE), {
      onConflict: "id",
    });
  }

  await updateSyncState({ pendingApplicationIds: [] });
}

async function processPendingOps(token, deviceId) {
  const state = (await getStorage("sync_state")) || {};
  const ops = state.pendingOps || [];
  if (!ops.length) return;

  const userId = (await getStorage("auth_session"))?.user?.id;
  for (const op of ops) {
    if (op.type === "delete_application" && op.id) {
      await restUpsert(
        "synced_applications",
        token,
        [
          {
            id: op.id,
            user_id: userId,
            ciphertext: "",
            content_hash: "deleted",
            updated_at: op.at || new Date().toISOString(),
            device_id: deviceId,
            deleted_at: op.at || new Date().toISOString(),
          },
        ],
        { onConflict: "id" }
      );
    }
  }
  await updateSyncState({ pendingOps: [] });
}

export async function pullCloudSync({ passphrase, fullMerge = false } = {}) {
  if (!SUPABASE_CONFIGURED) return { skipped: true };
  const { token, meta, passphrase: pp } = await requireSyncReady(passphrase);
  const deviceId = await ensureDeviceId();
  const state = (await getStorage("sync_state")) || {};
  const since = state.lastPulledAt;
  const sinceFilter = since
    ? `&updated_at=gt.${encodeURIComponent(since)}`
    : "";

  const remoteDocs = await restSelect(
    "sync_documents",
    token,
    { query: `?select=*&order=updated_at.asc${sinceFilter}` }
  );

  const docMeta = { ...(state.documents || {}) };
  for (const row of remoteDocs || []) {
    if (row.deleted_at) continue;
    const localMeta = docMeta[row.doc_key] || {};
    const winner = pickWinner(
      localMeta.localUpdatedAt,
      row.updated_at,
      deviceId,
      row.device_id
    );
    if (winner === "local" && !fullMerge) continue;

    const plain = await decryptPayload(row.ciphertext, { passphrase: pp, syncCryptoMeta: meta });
    let remoteValue = plain;
    if (typeof plain === "string" && plain.length) {
      try {
        remoteValue = JSON.parse(plain);
      } catch {
        remoteValue = plain;
      }
    }
    const localValue = await getStorage(row.doc_key);
    const merged = mergeFromCloud(row.doc_key, localValue, remoteValue);
    await setStorage(row.doc_key, merged, { skipSync: true });
    docMeta[row.doc_key] = {
      hash: row.content_hash,
      remoteUpdatedAt: row.updated_at,
      localUpdatedAt: row.updated_at,
      pendingPush: false,
    };
  }

  await pullApplications(token, meta, pp, deviceId, since, fullMerge);

  await updateSyncState({
    documents: docMeta,
    lastPulledAt: new Date().toISOString(),
    lastSyncAt: new Date().toISOString(),
    lastError: null,
  });

  await pullLicenseEntitlement(token);
  return { ok: true };
}

async function pullApplications(token, meta, passphrase, deviceId, since, fullMerge) {
  const sinceFilter = since
    ? `&updated_at=gt.${encodeURIComponent(since)}`
    : "";
  const remoteRows = await restSelect(
    "synced_applications",
    token,
    { query: `?select=*&order=updated_at.asc${sinceFilter}` }
  );

  const localApps = await getAllApplications();
  const localById = new Map(localApps.map((a) => [a.id, a]));

  for (const row of remoteRows || []) {
    if (row.deleted_at) {
      if (localById.has(row.id)) {
        await deleteApplication(row.id);
      }
      continue;
    }
    const existing = localById.get(row.id);
    const winner = pickWinner(
      existing?.updatedAt,
      row.updated_at,
      deviceId,
      row.device_id
    );
    if (existing && winner === "local" && !fullMerge) continue;
    if (!row.ciphertext) continue;

    const record = await decryptPayload(row.ciphertext, { passphrase, syncCryptoMeta: meta });
    if (!record?.id) continue;

    if (existing) {
      await updateApplication(record.id, record);
    } else {
      try {
        await addApplication(record);
      } catch {
        await updateApplication(record.id, record);
      }
    }
  }
}

export async function pullLicenseEntitlement(token) {
  try {
    const rows = await restSelect("license_entitlements", token, {
      query: "?select=tier,applications_used,expires_at&limit=1",
    });
    const ent = rows?.[0];
    if (!ent) return;
    const license = (await getStorage("license")) || {};
    if (ent.tier === "pro") {
      await setStorage(
        "license",
        {
          ...license,
          tier: "pro",
          validatedAt: new Date().toISOString(),
        },
        { skipSync: true }
      );
    }
    if (typeof ent.applications_used === "number" && ent.tier !== "pro") {
      await setStorage(
        "license",
        {
          ...license,
          applicationsUsed: ent.applications_used,
        },
        { skipSync: true }
      );
    }
  } catch {
    /* entitlements are optional */
  }
}

export async function linkLicenseToAccount(licenseKey) {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Sign in to link your license");
  return invokeEdgeFunction("link-license", token, { key: licenseKey });
}

export async function deleteCloudAccount() {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Sign in first");
  await invokeEdgeFunction("delete-account", token, {});
  const { signOut } = await import("./auth.js");
  await signOut();
  await setStorage("sync_crypto_meta", null, { skipSync: true });
  return { ok: true };
}

export async function exportCloudData({ passphrase } = {}) {
  await pullCloudSync({ passphrase, fullMerge: true });
  const settings = await getAllSettings();
  const applications = await getAllApplications();
  const exportedSettings = {};
  for (const key of SYNCABLE_USER_SETTINGS_KEYS) {
    exportedSettings[key] = prepareForCloud(key, settings[key]);
  }
  return {
    exportedAt: new Date().toISOString(),
    settings: exportedSettings,
    applications,
  };
}

export async function resetCloudSyncData() {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Sign in first");
  const userId = (await getStorage("auth_session"))?.user?.id;
  if (!userId) throw new Error("No user session");
  await restDelete("sync_documents", token, `?user_id=eq.${userId}`);
  await restDelete("synced_applications", token, `?user_id=eq.${userId}`);
  await updateSyncState({
    lastPulledAt: null,
    documents: {},
    pendingDocKeys: [],
    pendingApplicationIds: [],
    pendingOps: [],
  });
  return { ok: true };
}

export async function getSyncStatus() {
  const state = (await getStorage("sync_state")) || {};
  const syncEnabled = await getStorage("sync_enabled");
  const pendingCount =
    (state.pendingDocKeys?.length || 0) +
    (state.pendingApplicationIds?.length || 0) +
    (state.pendingOps?.length || 0);
  return {
    configured: SUPABASE_CONFIGURED,
    enabled: Boolean(syncEnabled),
    lastSyncAt: state.lastSyncAt,
    lastError: state.lastError,
    pendingCount,
    deviceId: state.deviceId,
  };
}

/** After local storage write, queue cloud push. */
export async function onSyncableStorageWrite(key) {
  await markStorageKeyPending(key);
}

export async function onApplicationWritten(id) {
  const { markApplicationPending } = await import("./sync-markers.js");
  await markApplicationPending(id);
}

export async function runFullSync({ passphrase } = {}) {
  await pushCloudSync({ passphrase });
  await pullCloudSync({ passphrase });
  return getSyncStatus();
}

export function registerSyncAlarm() {
  chrome.alarms.create("blitz-sync-retry", { periodInMinutes: 15 });
}

export async function handleSyncAlarm() {
  const status = await getSyncStatus();
  if (!status.enabled || !status.pendingCount) return;
  try {
    await pushCloudSync();
  } catch {
    /* retry later */
  }
}
