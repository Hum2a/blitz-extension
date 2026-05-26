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

export const SYNCABLE_STORAGE_KEYS = new Set(SYNCABLE_USER_SETTINGS_KEYS);

/** Never uploaded to cloud. */
export const LOCAL_ONLY_STORAGE_KEYS = new Set([
  "pending_job",
  "pending_application",
  "generation_status",
  "job_queue",
  "queue_processing",
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
    default:
      return remoteValue;
  }
}

export function serializeForCloud(key, value) {
  const prepared = prepareForCloud(key, value);
  if (prepared === null || prepared === undefined) return "";
  return JSON.stringify(prepared);
}
