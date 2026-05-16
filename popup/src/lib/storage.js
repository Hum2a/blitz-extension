const DEFAULTS = {
  cv_text: "",
  user_profile: {
    name: "",
    email: "",
    phone: "",
    location: "",
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
    model: "claude-sonnet-4-20250514",
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

export async function getStorage(key) {
  const result = await chrome.storage.local.get(key);
  if (key === null || key === undefined) {
    return result;
  }
  const value = result[key];
  if (value === undefined && key in DEFAULTS) {
    return DEFAULTS[key];
  }
  return value;
}

export async function setStorage(key, value) {
  await chrome.storage.local.set({ [key]: value });
}

export async function getAllSettings() {
  const stored = await chrome.storage.local.get(null);
  return { ...DEFAULTS, ...stored };
}

export async function mergeStorage(updates) {
  const current = await chrome.storage.local.get(null);
  await chrome.storage.local.set({ ...current, ...updates });
}

export { DEFAULTS };
