import { sendRuntimeMessage } from "./runtime-messages.js";
import { isExtensionPage } from "./extension-env.js";
import { isSupportedJobUrl, isInternalAppUrl } from "./queue-utils.js";

async function scrapeViaContentScript(tabId) {
  return chrome.tabs.sendMessage(tabId, { type: "SCRAPE_JOB" });
}

async function findJobTabInBrowser() {
  const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (active?.id && isSupportedJobUrl(active.url)) return active;

  const windowTabs = await chrome.tabs.query({ currentWindow: true });
  const inWindow = windowTabs.filter((t) => isSupportedJobUrl(t.url));
  if (inWindow.length) {
    return inWindow.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))[0];
  }

  const all = await chrome.tabs.query({});
  const any = all.filter((t) => isSupportedJobUrl(t.url));
  if (!any.length) return null;
  return any.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))[0];
}

/**
 * Read job data from the best available job tab (not the dashboard tab).
 */
export async function scrapeActiveTab() {
  if (!isExtensionPage()) {
    return sendRuntimeMessage({ type: "SCRAPE_ACTIVE_TAB" });
  }

  const [focused] = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab =
    focused?.id && isSupportedJobUrl(focused.url)
      ? focused
      : await findJobTabInBrowser();

  if (!tab?.id || !tab.url) {
    return {
      error:
        "No job tab found. Open a job on Greenhouse, LinkedIn, Indeed, or Workday in this browser window.",
      code: "no_job_tab",
    };
  }

  if (focused?.id && isInternalAppUrl(focused.url) && tab.id !== focused.id) {
    // Reading from another tab while dashboard/popup is focused — expected.
  }

  let jobData;
  let lastError = null;

  try {
    jobData = await scrapeViaContentScript(tab.id);
  } catch (err) {
    lastError = err?.message || String(err);
  }

  if (jobData?.error) {
    return { ...jobData, url: tab.url, tabId: tab.id };
  }

  if (!jobData?.jobTitle && !jobData?.jobDescription) {
    try {
      jobData = await sendRuntimeMessage({
        type: "SCRAPE_ACTIVE_TAB",
        payload: { tabId: tab.id },
      });
    } catch (err) {
      return {
        error: [
          lastError && `Content script: ${lastError}`,
          err?.message || String(err),
        ]
          .filter(Boolean)
          .join("\n\n"),
        url: tab.url,
        tabId: tab.id,
      };
    }
  }

  if (jobData?.error) return { ...jobData, url: tab.url, tabId: tab.id };
  if (!jobData?.jobTitle && !jobData?.jobDescription) {
    return {
      error: "No job listing detected on this page. Try refreshing the job tab.",
      url: tab.url,
      tabId: tab.id,
    };
  }

  return { ...jobData, url: tab.url, tabId: tab.id };
}
