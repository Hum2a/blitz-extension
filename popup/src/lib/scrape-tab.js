import { sendRuntimeMessage } from "./runtime-messages.js";
import { isExtensionPage } from "./extension-env.js";
import { isSupportedJobUrl } from "./queue-utils.js";

const SCRAPE_TIMEOUT_MS = 20000;

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

/** Prefer the tab the user was on before opening popup/dashboard. */
async function getPreferredJobTabId() {
  if (!isExtensionPage() || !chrome.tabs?.query) return undefined;

  try {
    const [active] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (active?.id && isSupportedJobUrl(active.url)) {
      return active.id;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

/**
 * Read job data from the best available job tab via the background worker
 * (same path as workspace — tab resolution + script injection).
 */
export async function scrapeActiveTab() {
  if (isExtensionPage() && typeof location !== "undefined") {
    const path = location.pathname || "";
    if (path.includes("dashboard.html") || path.includes("index.html")) {
      return {
        error: "Unsupported page",
        code: "extension_ui",
        url: location.href,
      };
    }
  }

  const tabId = await getPreferredJobTabId();

  const result = await withTimeout(
    sendRuntimeMessage({
      type: "SCRAPE_ACTIVE_TAB",
      payload: tabId != null ? { tabId } : {},
    }),
    SCRAPE_TIMEOUT_MS,
    "Timed out reading the job tab. Refresh the job page and try again."
  );

  return result;
}
