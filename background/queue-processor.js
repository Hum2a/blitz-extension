import { getStorage, setStorage, getAllSettings } from "../popup/src/lib/storage.js";
import { assertGenerationAllowed } from "../popup/src/lib/generation-guards.js";
import { incrementDailyUsage } from "../popup/src/lib/daily-limit.js";
import { recordClientEvent } from "../popup/src/lib/telemetry.js";
import { persistGeneratedApplication } from "../popup/src/lib/application-store.js";
import { recordApiUsage, API_USAGE_TYPES } from "../popup/src/lib/api-usage-log.js";

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

  try {
    await assertGenerationAllowed({ action: "queue", source: "queue" });
  } catch (err) {
    return { error: err.message };
  }

  await setStorage("queue_processing", true);

  try {
    let queue = (await getStorage("job_queue")) || [];
    const pendingCount = queue.filter((q) => q.status === "pending").length;
    recordClientEvent("queue_started", { queue_count: pendingCount }).catch(() => {});

    for (let i = 0; i < queue.length; i++) {
      if (await getStorage("queue_paused")) {
        break;
      }

      const item = queue[i];
      if (item.status !== "pending") continue;

      try {
        await assertGenerationAllowed({ action: "queue", source: "queue" });
      } catch (err) {
        queue[i] = { ...item, status: "error", error: err.message };
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
        const settings = await getAllSettings();
        const application = await generateApplication(
          jobData,
          settings.cv_text,
          settings.user_profile,
          settings.preferences,
          settings.linkedin_profile_text
        );

        await recordApiUsage({
          type: API_USAGE_TYPES.GENERATE_APPLICATION,
          provider: settings.ai_config?.provider,
          model: application?.cost?.model || settings.ai_config?.model,
          usage: application?.usage,
          cost: application?.cost,
          jobData,
          success: true,
        }).catch(() => {});

        await persistGeneratedApplication({ ...application, jobData }, jobData);
        await incrementDailyUsage();
        recordClientEvent("generate_completed", {
          platform: jobData.platform || "unknown",
          success: true,
          source: "queue",
        }).catch(() => {});

        queue = (await getStorage("job_queue")) || [];
        queue[i] = {
          ...item,
          status: "ready",
          jobData,
          application: { ...application, jobData },
          error: null,
        };
      } catch (err) {
        try {
          const failSettings = await getAllSettings();
          await recordApiUsage({
            type: API_USAGE_TYPES.GENERATE_APPLICATION,
            provider: failSettings.ai_config?.provider,
            model: failSettings.ai_config?.model,
            jobData: jobData || item.jobData,
            success: false,
            errorMessage: err.message,
          });
        } catch {
          /* ignore */
        }
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
    recordClientEvent("queue_finished", {}).catch(() => {});
  }

  return { done: true };
}

function broadcastQueueUpdate() {
  chrome.runtime.sendMessage({ type: "QUEUE_UPDATED" }).catch(() => {});
}
