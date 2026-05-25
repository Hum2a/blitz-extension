const EXTENSION_ID_KEY = "blitz_extension_id";

export function isExtensionPage() {
  return (
    typeof chrome !== "undefined" &&
    Boolean(chrome.runtime?.id) &&
    typeof location !== "undefined" &&
    location.protocol === "chrome-extension:"
  );
}

export function isWebDashboard() {
  return typeof chrome !== "undefined" && !isExtensionPage() && Boolean(getExtensionId());
}

export function getExtensionId() {
  if (isExtensionPage()) return chrome.runtime.id;
  try {
    return localStorage.getItem(EXTENSION_ID_KEY)?.trim() || "";
  } catch {
    return "";
  }
}

export function setExtensionId(id) {
  localStorage.setItem(EXTENSION_ID_KEY, id.trim());
}

/**
 * Send a message to the Blitz background worker (popup, dashboard, or localhost web).
 */
export function sendExtensionMessage(message) {
  return new Promise((resolve, reject) => {
    const deliver = (response) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err.message || "Could not reach Blitz extension"));
        return;
      }
      if (response?.error) {
        reject(new Error(response.error));
        return;
      }
      resolve(response);
    };

    if (isExtensionPage()) {
      chrome.runtime.sendMessage(message, deliver);
      return;
    }

    const extensionId = getExtensionId();
    if (!extensionId) {
      reject(
        new Error(
          "Blitz extension not linked. Open the web dashboard setup and paste your extension ID from chrome://extensions."
        )
      );
      return;
    }

    chrome.runtime.sendMessage(extensionId, message, deliver);
  });
}

export function openExtensionDashboard() {
  if (!isExtensionPage()) {
    window.open(
      `chrome-extension://${getExtensionId()}/popup/dist/dashboard.html`,
      "_blank",
      "noopener"
    );
    return;
  }
  chrome.tabs.create({ url: chrome.runtime.getURL("popup/dist/dashboard.html") });
}
