import { detectPlatformFromUrl } from "../popup/src/lib/queue-utils.js";

const JOB_URL_PATTERNS = [
  /greenhouse\.io/i,
  /linkedin\.com\/jobs/i,
  /indeed\.(com|co\.uk)/i,
  /myworkdayjobs\.com/i,
];

export function isSupportedJobUrl(url) {
  if (!url || !/^https?:/i.test(url)) return false;
  return JOB_URL_PATTERNS.some((re) => re.test(url));
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
      Boolean(jobData?.jobTitle || jobData?.jobDescription) &&
      !jobData?.externalApply &&
      !(jobData?.platform === "linkedin" && jobData?.hasEasyApply === false);

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

export async function listOpenJobTabs() {
  const tabs = await chrome.tabs.query({});
  const candidates = tabs.filter((t) => isSupportedJobUrl(t.url));
  const results = await Promise.all(candidates.map((tab) => queryTabJobInfo(tab)));
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
