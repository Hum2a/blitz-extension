import { getStorage, setStorage, getAllSettings } from "../popup/src/lib/storage.js";
import { canSubmitApplication } from "../popup/src/lib/license.js";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function waitForTabComplete(tabId, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error("Page load timeout"));
    }, timeoutMs);

    function listener(id, info) {
      if (id === tabId && info.status === "complete") {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function scrapeTab(tabId) {
  await sleep(2500);
  try {
    return await chrome.tabs.sendMessage(tabId, { type: "SCRAPE_JOB" });
  } catch (err) {
    return { error: err.message || "Could not scrape page. Site may block automation." };
  }
}

export async function processQueue(generateApplication) {
  const processing = await getStorage("queue_processing");
  if (processing) return { alreadyRunning: true };

  await setStorage("queue_processing", true);

  try {
    let queue = (await getStorage("job_queue")) || [];

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (item.status !== "pending") continue;

      const { allowed } = await canSubmitApplication();
      if (!allowed) {
        queue[i] = { ...item, status: "error", error: "Free tier limit reached" };
        await setStorage("job_queue", queue);
        broadcastQueueUpdate();
        break;
      }

      queue[i] = { ...item, status: "processing" };
      await setStorage("job_queue", queue);
      broadcastQueueUpdate();

      let tabId = null;
      let closeWhenDone = false;
      try {
        let jobData = item.jobData;
        const hasJobData = () => jobData?.jobTitle || jobData?.jobDescription;

        if (item.sourceTabId) {
          try {
            const existing = await chrome.tabs.get(item.sourceTabId);
            if (existing?.url === item.url) {
              tabId = item.sourceTabId;
              const fresh = await scrapeTab(tabId);
              if (fresh && !fresh.error) jobData = fresh;
            }
          } catch {
            /* tab closed */
          }
        }

        if (!hasJobData()) {
          const tab = await chrome.tabs.create({ url: item.url, active: false });
          tabId = tab.id;
          closeWhenDone = true;
          await waitForTabComplete(tabId);
          jobData = await scrapeTab(tabId);
        }

        if (jobData?.error) throw new Error(jobData.error);
        if (!jobData?.jobTitle && !jobData?.jobDescription) {
          throw new Error("No job data found on page");
        }
        if (jobData.externalApply) {
          throw new Error("External apply — open manually");
        }

        const settings = await getAllSettings();
        const application = await generateApplication(
          jobData,
          settings.cv_text,
          settings.user_profile,
          settings.preferences,
          settings.linkedin_profile_text
        );

        queue = (await getStorage("job_queue")) || [];
        queue[i] = {
          ...item,
          status: "ready",
          jobData,
          application: { ...application, jobData },
          error: null,
        };
      } catch (err) {
        queue = (await getStorage("job_queue")) || [];
        queue[i] = { ...item, status: "error", error: err.message };
      } finally {
        if (tabId && closeWhenDone) chrome.tabs.remove(tabId).catch(() => {});
      }

      await setStorage("job_queue", queue);
      broadcastQueueUpdate();
      await sleep(1500);
    }
  } finally {
    await setStorage("queue_processing", false);
    broadcastQueueUpdate();
  }

  return { done: true };
}

function broadcastQueueUpdate() {
  chrome.runtime.sendMessage({ type: "QUEUE_UPDATED" }).catch(() => {});
}
