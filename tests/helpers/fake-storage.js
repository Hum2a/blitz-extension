import { getChromeStore } from "../setup/chrome-mock.js";

/** Seed chrome.storage.local before importing storage helpers. */
export function seedStorage(values) {
  Object.assign(getChromeStore(), values);
}

export function readStorage(key) {
  const store = getChromeStore();
  return key == null ? { ...store } : store[key];
}
