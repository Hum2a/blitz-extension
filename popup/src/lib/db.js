const DB_NAME = "blitz_db";
const DB_VERSION = 3;
const STORE_NAME = "applications";
export const API_USAGE_STORE = "api_usage";

async function notifyApplicationsChanged() {
  try {
    await chrome.storage.local.set({ applications_updated_at: Date.now() });
  } catch {
    /* popup / dashboard may be unavailable */
  }
}

async function notifyApiUsageChanged() {
  try {
    await chrome.storage.local.set({ api_usage_updated_at: Date.now() });
  } catch {
    /* ignore */
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      let store;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
      } else {
        store = event.target.transaction.objectStore(STORE_NAME);
      }
      if (!store.indexNames.contains("appliedAt")) {
        store.createIndex("appliedAt", "appliedAt", { unique: false });
      }
      if (!store.indexNames.contains("company")) {
        store.createIndex("company", "company", { unique: false });
      }
      if (!store.indexNames.contains("listingKey")) {
        store.createIndex("listingKey", "listingKey", { unique: false });
      }
      if (!db.objectStoreNames.contains(API_USAGE_STORE)) {
        const usageStore = db.createObjectStore(API_USAGE_STORE, { keyPath: "id" });
        usageStore.createIndex("at", "at", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function addApplication(record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.add(record);
    request.onsuccess = () => {
      notifyApplicationsChanged();
      resolve(record);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getAllApplications() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const apps = request.result.sort(
        (a, b) =>
          new Date(b.updatedAt || b.generatedAt || b.appliedAt) -
          new Date(a.updatedAt || a.generatedAt || a.appliedAt)
      );
      resolve(apps);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getApplicationByListingKey(listingKeyValue) {
  if (!listingKeyValue) return null;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    if (!store.indexNames.contains("listingKey")) {
      getAllApplications().then((apps) => {
        resolve(apps.find((a) => a.listingKey === listingKeyValue) || null);
      });
      return;
    }
    const index = store.index("listingKey");
    const request = index.get(listingKeyValue);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function updateApplication(id, updates) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const existing = getReq.result;
      if (!existing) {
        reject(new Error("Application not found"));
        return;
      }
      const updated = { ...existing, ...updates, id: existing.id };
      const putReq = store.put(updated);
      putReq.onsuccess = () => {
        notifyApplicationsChanged();
        resolve(updated);
      };
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function getApplicationsThisWeek() {
  const apps = await getAllApplications();
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return apps.filter((a) => {
    const t = new Date(a.updatedAt || a.generatedAt || a.appliedAt).getTime();
    return t >= weekAgo;
  });
}

export async function addApiUsageRecord(record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(API_USAGE_STORE, "readwrite");
    const store = tx.objectStore(API_USAGE_STORE);
    const request = store.add(record);
    request.onsuccess = () => {
      notifyApiUsageChanged();
      resolve(record);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getAllApiUsageRecords() {
  const db = await openDB();
  if (!db.objectStoreNames.contains(API_USAGE_STORE)) {
    return [];
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(API_USAGE_STORE, "readonly");
    const store = tx.objectStore(API_USAGE_STORE);
    const request = store.getAll();
    request.onsuccess = () => {
      const rows = request.result.sort((a, b) => new Date(b.at) - new Date(a.at));
      resolve(rows);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function clearApiUsageRecords() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    if (!db.objectStoreNames.contains(API_USAGE_STORE)) {
      resolve();
      return;
    }
    const tx = db.transaction(API_USAGE_STORE, "readwrite");
    const store = tx.objectStore(API_USAGE_STORE);
    const request = store.clear();
    request.onsuccess = () => {
      notifyApiUsageChanged();
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}
