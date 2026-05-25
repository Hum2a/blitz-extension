const DEFAULTS = {
  cv_text: "",
  linkedin_profile_text: "",
  user_profile: {
    name: "",
    email: "",
    phone: "",
    location: "",
    github: "",
    linkedin: "",
    portfolio: "",
    rightToWork: "",
    noticePeriod: "",
    salaryExpectation: "",
    remotePreference: "Hybrid",
    willingToRelocate: false,
    skills: {},
  },
  ai_config: {
    provider: "anthropic",
    apiKey: "",
    model: "claude-sonnet-4-6",
  },
  license: {
    key: "",
    tier: "free",
    validatedAt: null,
    applicationsUsed: 0,
  },
  preferences: {
    coverLetterMode: "always",
    autoSubmit: false,
    dailyLimit: 25,
    cvTemplate: "modern",
  },
  pending_job: null,
  pending_application: null,
  job_queue: [],
  queue_processing: false,
};

import { remapAnthropicModel, ANTHROPIC_DEFAULT_MODEL, OPENAI_DEFAULT_MODEL } from "./models.js";

export function normalizeAiConfig(aiConfig) {
  const base = { ...DEFAULTS.ai_config, ...(aiConfig || {}) };
  if (base.provider === "anthropic") {
    const remapped = remapAnthropicModel(base.model);
    if (remapped !== base.model) {
      return { ...base, model: remapped };
    }
  }
  if (!base.model?.trim()) {
    return {
      ...base,
      model: base.provider === "openai" ? OPENAI_DEFAULT_MODEL : ANTHROPIC_DEFAULT_MODEL,
    };
  }
  return base;
}

async function persistAiConfigIfMigrated(previous, normalized) {
  if (previous?.model === normalized.model) return;
  await storageSet({
    ai_config: {
      ...previous,
      provider: normalized.provider,
      apiKey: normalized.apiKey,
      model: normalized.model,
    },
  });
}

export class StorageError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "StorageError";
    this.cause = cause;
  }
}

function storageSet(items) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(items, () => {
      const err = chrome.runtime.lastError;
      if (err) {
        const msg = err.message || "Storage write failed";
        if (/quota|QUOTA|exceed/i.test(msg)) {
          reject(
            new StorageError(
              "Storage full — remove old queue items or shorten saved text. Chrome allows ~10MB unless unlimitedStorage is enabled.",
              err
            )
          );
        } else {
          reject(new StorageError(msg, err));
        }
      } else {
        resolve();
      }
    });
  });
}

function storageGet(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, (result) => {
      const err = chrome.runtime.lastError;
      if (err) reject(new StorageError(err.message, err));
      else resolve(result);
    });
  });
}

export async function getStorage(key) {
  const result = await storageGet(key);
  if (key === null || key === undefined) {
    return result;
  }
  let value = result[key];
  if (value === undefined && key in DEFAULTS) {
    value = DEFAULTS[key];
  }
  if (key === "ai_config") {
    const normalized = normalizeAiConfig(value);
    await persistAiConfigIfMigrated(value, normalized);
    return normalized;
  }
  return value;
}

export async function setStorage(key, value) {
  await storageSet({ [key]: value });
}

/** Write only the keys provided (does not load/rewrite entire storage). */
export async function mergeStorage(updates) {
  if (!updates || typeof updates !== "object") return;
  await storageSet(updates);
}

/** Persist CV / LinkedIn text immediately (survives popup close). */
export async function saveProfileTexts({ cv_text, linkedin_profile_text }) {
  const payload = {};
  if (cv_text !== undefined) payload.cv_text = cv_text ?? "";
  if (linkedin_profile_text !== undefined) payload.linkedin_profile_text = linkedin_profile_text ?? "";
  if (Object.keys(payload).length === 0) return;
  await storageSet(payload);
}

export async function getProfileTexts() {
  const { cv_text, linkedin_profile_text } = await storageGet(["cv_text", "linkedin_profile_text"]);
  return {
    cv_text: cv_text ?? "",
    linkedin_profile_text: linkedin_profile_text ?? "",
  };
}

export async function getStorageUsage() {
  if (!chrome.storage.local.getBytesInUse) {
    return { bytesInUse: null, quota: null };
  }
  const bytesInUse = await new Promise((resolve, reject) => {
    chrome.storage.local.getBytesInUse(null, (n) => {
      const err = chrome.runtime.lastError;
      if (err) reject(new StorageError(err.message, err));
      else resolve(n);
    });
  });
  return { bytesInUse, quota: chrome.storage.local.QUOTA_BYTES ?? 10_485_760 };
}

export async function getAllSettings() {
  const stored = await storageGet(null);
  const merged = { ...DEFAULTS, ...stored };
  const ai_config = normalizeAiConfig(merged.ai_config);
  await persistAiConfigIfMigrated(merged.ai_config, ai_config);
  return { ...merged, ai_config };
}

export { DEFAULTS };
