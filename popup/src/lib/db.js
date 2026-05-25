const DB_NAME = "blitz_db";
const DB_VERSION = 1;
const STORE_NAME = "applications";

async function notifyApplicationsChanged() {
  try {
    await chrome.storage.local.set({ applications_updated_at: Date.now() });
  } catch {
    /* popup / dashboard may be unavailable */
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("appliedAt", "appliedAt", { unique: false });
        store.createIndex("company", "company", { unique: false });
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
        (a, b) => new Date(b.appliedAt) - new Date(a.appliedAt)
      );
      resolve(apps);
    };
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
      const updated = { ...existing, ...updates };
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
  return apps.filter((a) => new Date(a.appliedAt).getTime() >= weekAgo);
}
