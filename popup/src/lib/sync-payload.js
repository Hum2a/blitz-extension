/**
 * User settings synced to sync_documents (E2EE ciphertext in Postgres).
 * Secrets and session/ephemeral keys stay local — see LOCAL_ONLY_STORAGE_KEYS.
 */

import { DEFAULTS } from "./storage.js";

/** All persisted user preferences/settings (from storage DEFAULTS). */
export const SYNCABLE_USER_SETTINGS_KEYS = [
  "cv_text",
  "linkedin_profile_text",
  "user_profile",
  "preferences",
  "appearance",
  "cv_html_template",
  "ai_config",
  "license",
];

/** Workspace state synced E2EE (metadata only — no CV bodies in queue). */
export const WORKSPACE_SYNC_KEYS = ["job_queue", "pending_job"];

export const SYNCABLE_STORAGE_KEYS = new Set([
  ...SYNCABLE_USER_SETTINGS_KEYS,
  ...WORKSPACE_SYNC_KEYS,
]);

/** Never uploaded to cloud. */
export const LOCAL_ONLY_STORAGE_KEYS = new Set([
  "pending_application",
  "generation_status",
  "queue_processing",
  "queue_paused",
  "debug_log",
  "auth_session",
  "sync_state",
  "sync_crypto_meta",
  "sync_enabled",
  "sync_unlocked",
  "ui_state",
]);

export function isSyncableStorageKey(key) {
  return SYNCABLE_STORAGE_KEYS.has(key);
}

/** Strip secrets before encrypt/upload. */
export function prepareForCloud(key, value) {
  switch (key) {
    case "ai_config": {
      const base = { ...DEFAULTS.ai_config, ...(value || {}) };
      return { provider: base.provider, model: base.model };
    }
    case "license": {
      const base = { ...DEFAULTS.license, ...(value || {}) };
      return {
        tier: base.tier,
        applicationsUsed: base.applicationsUsed,
        validatedAt: base.validatedAt,
        billingSource: base.billingSource || null,
      };
    }
    case "job_queue": {
      const items = Array.isArray(value) ? value : [];
      return items.map((item) => ({
        id: item.id,
        url: item.url,
        platform: item.platform,
        status: item.status,
        addedAt: item.addedAt,
        error: item.error || null,
        sourceTabId: item.sourceTabId ?? null,
        sourceTabTitle: item.sourceTabTitle || null,
        jobData: item.jobData
          ? {
              jobTitle: item.jobData.jobTitle,
              company: item.jobData.company,
              url: item.jobData.url,
              platform: item.jobData.platform,
            }
          : null,
      }));
    }
    case "pending_job": {
      if (!value) return null;
      return {
        jobTitle: value.jobTitle,
        company: value.company,
        url: value.url,
        platform: value.platform,
        externalApply: Boolean(value.externalApply),
      };
    }
    default:
      return value;
  }
}

/** Merge remote settings into local storage (preserve device-only fields). */
export function mergeFromCloud(key, localValue, remoteValue) {
  if (remoteValue === undefined) return localValue;

  switch (key) {
    case "ai_config":
      return {
        ...DEFAULTS.ai_config,
        ...(typeof localValue === "object" && localValue ? localValue : {}),
        ...(typeof remoteValue === "object" && remoteValue ? remoteValue : {}),
        apiKey:
          (typeof localValue === "object" && localValue?.apiKey) ||
          DEFAULTS.ai_config.apiKey,
      };
    case "license":
      return {
        ...DEFAULTS.license,
        ...(typeof localValue === "object" && localValue ? localValue : {}),
        ...(typeof remoteValue === "object" && remoteValue ? remoteValue : {}),
        key:
          (typeof localValue === "object" && localValue?.key) || DEFAULTS.license.key,
      };
    case "job_queue": {
      const local = Array.isArray(localValue) ? localValue : [];
      const remote = Array.isArray(remoteValue) ? remoteValue : [];
      if (!remote.length) return local;
      if (!local.length) return remote;
      return remote.length >= local.length ? remote : local;
    }
    case "pending_job":
      if (!remoteValue) return localValue;
      if (!localValue) return remoteValue;
      return remoteValue;
    default:
      return remoteValue;
  }
}

export function serializeForCloud(key, value) {
  const prepared = prepareForCloud(key, value);
  if (prepared === null || prepared === undefined) return "";
  return JSON.stringify(prepared);
}
