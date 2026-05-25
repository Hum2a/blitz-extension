/** Storage keys eligible for encrypted cloud sync (never includes API keys). */
export const SYNCABLE_STORAGE_KEYS = new Set([
  "cv_text",
  "linkedin_profile_text",
  "user_profile",
  "preferences",
  "appearance",
  "cv_html_template",
]);

/** Keys that must never leave the device. */
export const LOCAL_ONLY_STORAGE_KEYS = new Set([
  "ai_config",
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
  "license",
]);

export function isSyncableStorageKey(key) {
  return SYNCABLE_STORAGE_KEYS.has(key);
}
