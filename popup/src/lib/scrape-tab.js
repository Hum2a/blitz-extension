import { sendRuntimeMessage } from "./runtime-messages.js";

const SUPPORTED_URL =
  /greenhouse\.io|linkedin\.com\/jobs|indeed\.(com|co\.uk|fr|de)|myworkdayjobs\.com/i;

export function isSupportedJobUrl(url) {
  return url && SUPPORTED_URL.test(url);
}

async function scrapeViaContentScript(tabId) {
  return chrome.tabs.sendMessage(tabId, { type: "SCRAPE_JOB" });
}

/**
 * Read job data from the active tab. Tries content script first, then background inject.
 */
export async function scrapeActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) {
    return { error: "No active tab" };
  }
  if (!isSupportedJobUrl(tab.url)) {
    return {
      error: `Unsupported page: ${tab.url}\n\nOpen a job on Greenhouse, LinkedIn, Indeed, or Workday.`,
    };
  }

  let jobData;
  let lastError = null;

  try {
    jobData = await scrapeViaContentScript(tab.id);
  } catch (err) {
    lastError = err?.message || String(err);
  }

  if (jobData?.error) return jobData;

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
      };
    }
  }

  if (jobData?.error) return jobData;
  if (!jobData?.jobTitle && !jobData?.jobDescription) {
    return { error: "No job listing detected on this page. Try refreshing the tab." };
  }

  return jobData;
}
