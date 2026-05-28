import {
  detectPlatformFromUrl,
  isSupportedJobUrl,
} from "../popup/src/lib/queue-utils.js";
import { listingKey } from "../popup/src/lib/job-listing.js";
import { getAllApplications } from "../popup/src/lib/db.js";

export { isSupportedJobUrl };

/**
 * Pick a job board tab to scrape when the dashboard/popup tab is focused.
 */
export async function findJobTabForScrape(preferredTabId) {
  if (preferredTabId != null) {
    try {
      const tab = await chrome.tabs.get(preferredTabId);
      if (isSupportedJobUrl(tab.url)) return tab;
    } catch {
      /* tab closed */
    }
  }

  const [active] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
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

export async function queryTabJobInfo(tab) {
  const platform = detectPlatformFromUrl(tab.url);
  const base = {
    tabId: tab.id,
    windowId: tab.windowId,
    title: tab.title || "Untitled tab",
    url: tab.url,
    favIconUrl: tab.favIconUrl || null,
    active: tab.active,
    platform,
  };

  if (!platform) {
    return {
      ...base,
      context: { pageType: "unsupported", hint: "Not a supported job URL" },
      jobData: null,
      capturable: false,
    };
  }

  try {
    const info = await chrome.tabs.sendMessage(tab.id, { type: "GET_TAB_JOB_INFO" });
    const context = info?.context || { pageType: "platform", hint: "Job site tab" };
    const jobData = info?.jobData?.error ? null : info?.jobData;
    const capturable =
      Boolean(context?.canCapture) &&
      Boolean(jobData?.jobTitle || jobData?.jobDescription);

    return {
      ...base,
      context,
      jobData,
      capturable,
      scrapeError: info?.jobData?.error || info?.error || null,
    };
  } catch (err) {
    return {
      ...base,
      context: {
        pageType: "unknown",
        hint: "Reload this tab so Blitz can read it",
        canCapture: false,
      },
      jobData: null,
      capturable: false,
      scrapeError: err.message || "Content script not ready",
    };
  }
}

function historyForJob(jobData, url, historyByKey) {
  const key = listingKey(jobData || { url });
  if (!key || !historyByKey) return null;
  const record = historyByKey.get(key);
  if (!record) return null;
  return {
    id: record.id,
    status: record.status,
    matchScore: record.matchScore,
    generatedAt: record.generatedAt,
    updatedAt: record.updatedAt,
    applicationTitle: record.applicationTitle,
  };
}

export async function listOpenJobTabs() {
  const tabs = await chrome.tabs.query({});
  const candidates = tabs.filter((t) => isSupportedJobUrl(t.url));
  const historyRecords = await getAllApplications();
  const historyByKey = new Map(
    historyRecords.filter((r) => r.listingKey).map((r) => [r.listingKey, r])
  );
  const results = await Promise.all(
    candidates.map(async (tab) => {
      const info = await queryTabJobInfo(tab);
      const history = historyForJob(info.jobData, tab.url, historyByKey);
      return { ...info, history };
    })
  );
  return results.sort((a, b) => {
    if (a.capturable !== b.capturable) return a.capturable ? -1 : 1;
    if (a.active !== b.active) return a.active ? -1 : 1;
    return (a.title || "").localeCompare(b.title || "");
  });
}

export function queueItemsFromTabs(tabEntries, existingQueue = []) {
  const existingUrls = new Set(existingQueue.map((i) => i.url));
  const added = [];

  for (const tab of tabEntries) {
    if (!tab.capturable || !tab.url) continue;
    if (existingUrls.has(tab.url)) continue;

    const item = {
      id: crypto.randomUUID(),
      url: tab.url,
      platform: tab.platform || detectPlatformFromUrl(tab.url),
      status: "pending",
      addedAt: new Date().toISOString(),
      jobData: tab.jobData || null,
      application: null,
      error: null,
      sourceTabId: tab.tabId,
      sourceTabTitle: tab.title,
    };
    added.push(item);
    existingUrls.add(tab.url);
  }

  return added;
}
