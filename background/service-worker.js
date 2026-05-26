import {
  getStorage,
  setStorage,
  getAllSettings,
  normalizeAiConfig,
} from "../popup/src/lib/storage.js";
import { PROMPTS, formatApplicationTitle, buildApplicationPrompts } from "../popup/src/lib/prompts.js";
import { estimateCostFromPromptBundle } from "../popup/src/lib/cost-estimate.js";
import { callAI, parseApplicationResponse } from "../popup/src/lib/ai.js";
import { costFromUsage } from "../popup/src/lib/cost-estimate.js";
import {
  fetchAnthropicModels,
  ANTHROPIC_MODEL_SUGGESTIONS,
  remapAnthropicModel,
} from "../popup/src/lib/models.js";
import { formatPromptStats } from "../popup/src/lib/generation-progress.js";
import {
  canSubmitApplication,
  incrementApplicationCount,
  checkLicenseStatus,
  validateLicense,
} from "../popup/src/lib/license.js";
import { processQueue } from "./queue-processor.js";
import { startBackgroundGeneration } from "./generation-runner.js";
import { listOpenJobTabs, queueItemsFromTabs, findJobTabForScrape } from "./tab-jobs.js";
import { buildRenderedCvHtml } from "../popup/src/lib/cv-export.js";
import {
  applicationMatchesJob,
  withListingKey,
} from "../popup/src/lib/job-listing.js";
import {
  persistGeneratedApplication,
  appendHistoryEventForJob,
  loadApplicationIntoPending,
  HISTORY_EVENT_TYPES,
} from "../popup/src/lib/application-store.js";
import { recordApiUsage, API_USAGE_TYPES } from "../popup/src/lib/api-usage-log.js";
import {
  handleSyncAuthMessage,
  initSyncBackground,
} from "./sync-messages.js";
import { scriptsForUrl, safeHostname } from "../popup/src/lib/content-scripts.js";

const OFFSCREEN_URL = "offscreen/offscreen.html";

initSyncBackground();

async function setPendingJobAndReconcile(jobData) {
  await setStorage("pending_job", jobData);
  const app = await getStorage("pending_application");
  if (app && jobData && !applicationMatchesJob(app, jobData)) {
    await setStorage("pending_application", null);
  }
}

async function logGenerateApiCall(settings, jobData, result, error) {
  try {
    await recordApiUsage({
      type: API_USAGE_TYPES.GENERATE_APPLICATION,
      provider: settings?.ai_config?.provider,
      model: result?.cost?.model || settings?.ai_config?.model,
      usage: result?.usage,
      cost: result?.cost,
      jobData,
      success: !error,
      errorMessage: error?.message,
    });
  } catch {
    /* never block generation on log failure */
  }
}

async function savePendingApplication(result, jobData) {
  const application = withListingKey({ ...result, jobData }, jobData);
  await setStorage("pending_application", application);
  return application;
}

async function migrateStoredAiConfig() {
  const raw = (await getStorage("ai_config")) || {};
  const normalized = normalizeAiConfig(raw);
  if (normalized.model !== raw.model) {
    await setStorage("ai_config", normalized);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  migrateStoredAiConfig().catch(() => {});
});

chrome.runtime.onStartup.addListener(() => {
  migrateStoredAiConfig().catch(() => {});
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GENERATE_PDF_OFFSCREEN") {
    return false;
  }
  handleMessage(message, sender).then(sendResponse).catch((err) => {
    sendResponse({ error: err.message || "Unknown error" });
  });
  return true;
});

/** Local web dashboard (npm run web:dev) uses the same APIs via extension ID. */
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  const origin = sender.origin || "";
  const allowed =
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  if (!allowed) {
    sendResponse({ error: "Origin not allowed" });
    return;
  }
  handleMessage(message, sender).then(sendResponse).catch((err) => {
    sendResponse({ error: err.message || "Unknown error" });
  });
  return true;
});

async function handleMessage(message, sender) {
  const syncResult = await handleSyncAuthMessage(message);
  if (syncResult !== null) return syncResult;

  switch (message.type) {
    case "PING":
      return {
        ok: true,
        version: chrome.runtime.getManifest().version,
        handlers: [
          "PING",
          "SCRAPE_ACTIVE_TAB",
          "GENERATE_APPLICATION",
          "JOB_DETECTED",
          "FILL_FORM",
        ],
      };

    case "JOB_DETECTED":
      await setPendingJobAndReconcile(message.payload);
      chrome.runtime.sendMessage({ type: "JOB_DETECTED", payload: message.payload }).catch(() => {});
      return { ok: true };

    case "BLITZ_PAGE_STATE":
      return { ok: true };

    case "OPEN_BLITZ": {
      const popupUrl = chrome.runtime.getURL("popup/dist/index.html");
      try {
        await chrome.action.openPopup();
        return { ok: true, mode: "popup" };
      } catch {
        await chrome.tabs.create({ url: popupUrl });
        return { ok: true, mode: "tab" };
      }
    }

    case "WIDGET_GENERATE": {
      const job = message.payload?.jobData;
      if (!job?.jobTitle && !job?.jobDescription) {
        return { error: "No job on this page" };
      }
      return startBackgroundGeneration({
        jobData: job,
        generateApplication,
        savePendingApplication,
        persistGeneratedApplication,
        logGenerateApiCall,
        setPendingJobAndReconcile,
        options: {
          requirePromptPreflight: false,
          source: "widget",
          completeMessage: "Application ready — open Blitz to review",
        },
      });
    }

    case "ESTIMATE_GENERATION_COST": {
      const settings = await getAllSettings();
      const jobData = message.payload?.jobData || (await getStorage("pending_job"));
      if (!settings.ai_config?.apiKey?.trim()) {
        return { error: "Add your API key in Settings." };
      }
      if (!settings.cv_text?.trim()) {
        return { error: "Add your CV in Settings." };
      }
      if (!jobData?.jobTitle && !jobData?.jobDescription) {
        return { error: "No job detected on this page." };
      }
      const bundle = buildApplicationPrompts({
        cvText: settings.cv_text,
        jobData,
        preferences: settings.preferences,
        linkedinProfileText: settings.linkedin_profile_text,
        userProfile: settings.user_profile,
      });
      return estimateCostFromPromptBundle(
        bundle,
        {
          provider: settings.ai_config.provider,
          model: settings.ai_config.model,
        },
        settings.user_profile || {}
      );
    }

    case "GENERATE_APPLICATION": {
      const jobData = message.payload?.jobData || (await getStorage("pending_job"));
      if (!jobData) {
        return { error: "No job detected. Open a supported job listing first." };
      }
      return startBackgroundGeneration({
        jobData,
        generateApplication,
        savePendingApplication,
        persistGeneratedApplication,
        logGenerateApiCall,
        setPendingJobAndReconcile,
        options: {
          requirePromptPreflight: true,
          source: "dashboard",
          completeMessage: "Application ready — opening review",
        },
      });
    }

    case "GET_GENERATION_STATUS": {
      return { status: (await getStorage("generation_status")) || { active: false } };
    }

    case "LOAD_HISTORY_APPLICATION": {
      const record = message.payload?.record;
      if (!record?.id) return { error: "No history record" };
      const loaded = await loadApplicationIntoPending(record);
      await setStorage("pending_job", loaded.job);
      await savePendingApplication(
        { ...loaded.application, jobData: loaded.job },
        loaded.job
      );
      return { ok: true, application: loaded.application, job: loaded.job };
    }

    case "VALIDATE_LICENSE": {
      const result = await validateLicense(message.payload.key);
      if (result.valid) {
        const license = await getStorage("license");
        await setStorage("license", {
          ...license,
          key: message.payload.key,
          tier: result.tier,
          validatedAt: new Date().toISOString(),
        });
        try {
          const { linkLicenseToAccount, pullLicenseEntitlement } = await import(
            "../popup/src/lib/sync-engine.js"
          );
          const { getValidAccessToken } = await import("../popup/src/lib/auth.js");
          if (await getValidAccessToken()) {
            await linkLicenseToAccount(message.payload.key);
            await pullLicenseEntitlement(await getValidAccessToken());
          }
        } catch {
          /* account link optional */
        }
      }
      return result;
    }

    case "GET_APPLICATION_COUNT": {
      const status = await checkLicenseStatus();
      const { allowed, remaining, used } = await canSubmitApplication();
      return { used, remaining, tier: status.tier, allowed };
    }

    case "GENERATE_PDF": {
      const base64 = await generatePdfOffscreen(message.payload || {});
      return { base64 };
    }

    case "FILL_FORM": {
      const application = await getStorage("pending_application");
      const settings = await getAllSettings();
      let tabId = sender.tab?.id || message.payload?.tabId;

      if (!tabId) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        tabId = tab?.id;
      }

      if (!tabId) throw new Error("No active tab for form fill");
      if (!application) throw new Error("No application to fill. Generate one first.");

      let pdfBase64 = null;
      try {
        pdfBase64 = await generatePdfOffscreen({
          pdfLayoutHtml: application.pdfLayoutHtml,
          htmlOverride: application.pdfHtmlOverride,
          useManualOverride: Boolean(
            application.pdfHtmlOverride?.trim() && !application.pdfLayoutHtml?.trim()
          ),
          cvDocument: application.cvDocument,
          tailoredCV: application.tailoredCV,
          userProfile: settings.user_profile,
        });
      } catch {
        pdfBase64 = null;
      }

      await chrome.tabs.sendMessage(tabId, {
        type: "FILL_FORM",
        payload: {
          tailoredCV: application.tailoredCV,
          coverLetter: application.coverLetter,
          screeningAnswers: application.screeningAnswers,
          userProfile: settings.user_profile,
          pdfBase64,
          autoSubmit: settings.preferences?.autoSubmit ?? false,
        },
      });

      return { ok: true };
    }

    case "APPLICATION_SUBMITTED":
      await incrementApplicationCount();
      const pendingJob = await getStorage("pending_job");
      if (pendingJob) {
        await appendHistoryEventForJob(pendingJob, HISTORY_EVENT_TYPES.SUBMITTED);
      }
      await setStorage("pending_application", null);
      chrome.runtime.sendMessage({ type: "APPLICATION_SUBMITTED" }).catch(() => {});
      return { ok: true };

    case "LIST_JOB_TABS": {
      const tabs = await listOpenJobTabs();
      return { tabs };
    }

    case "ADD_QUEUE_URLS": {
      const existing = (await getStorage("job_queue")) || [];
      const incoming = message.payload?.items || [];
      await setStorage("job_queue", [...existing, ...incoming]);
      return { ok: true, count: existing.length + incoming.length };
    }

    case "ADD_TABS_TO_QUEUE": {
      const tabIds = message.payload?.tabIds || [];
      const allTabs = await listOpenJobTabs();
      const selected = allTabs.filter((t) => tabIds.includes(t.tabId));
      const existing = (await getStorage("job_queue")) || [];
      const incoming = queueItemsFromTabs(selected, existing);
      if (incoming.length === 0) {
        return {
          ok: false,
          error: "No new capturable jobs to add (select Ready tabs or avoid duplicates)",
          added: 0,
        };
      }
      await setStorage("job_queue", [...existing, ...incoming]);
      chrome.runtime.sendMessage({ type: "QUEUE_UPDATED" }).catch(() => {});
      return { ok: true, added: incoming.length, count: existing.length + incoming.length };
    }

    case "GET_QUEUE": {
      return {
        queue: (await getStorage("job_queue")) || [],
        processing: await getStorage("queue_processing"),
      };
    }

    case "PROCESS_QUEUE": {
      processQueue(generateApplication).catch(() => {});
      return { ok: true, started: true };
    }

    case "CLEAR_QUEUE": {
      await setStorage("job_queue", []);
      return { ok: true };
    }

    case "SCRAPE_ACTIVE_TAB": {
      return scrapeActiveTabJob(message.payload?.tabId);
    }

    case "LIST_ANTHROPIC_MODELS": {
      const config = await getStorage("ai_config");
      const apiKey = message.payload?.apiKey || config?.apiKey;
      const models = await fetchAnthropicModels(apiKey);
      return { models: models?.length ? models : ANTHROPIC_MODEL_SUGGESTIONS };
    }

    case "TEST_API_KEY": {
      const { provider, apiKey, model } = message.payload;
      try {
        const { text, usage, model: usedModel } = await callAI({
          provider,
          apiKey,
          model,
          systemPrompt: "Reply with exactly: OK",
          userPrompt: "Test",
        });
        const cost = costFromUsage(usage, provider, usedModel || model);
        await recordApiUsage({
          type: API_USAGE_TYPES.API_TEST,
          provider,
          model: usedModel || model,
          usage,
          cost,
          success: true,
        });
        return { ok: text.includes("OK") || text.length > 0 };
      } catch (err) {
        await recordApiUsage({
          type: API_USAGE_TYPES.API_TEST,
          provider,
          model,
          success: false,
          errorMessage: err.message,
        });
        throw err;
      }
    }

    default:
      throw new Error(`Unknown message type: ${message.type}`);
  }
}

import { scriptsForUrl, safeHostname } from "../popup/src/lib/content-scripts.js";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function scrapeActiveTabJob(tabId) {
  const tab = await findJobTabForScrape(tabId);

  if (!tab?.id || !tab.url) {
    return {
      error:
        "No job tab found. Open a job on Greenhouse, LinkedIn, Indeed, or Workday in this browser window.",
      code: "no_job_tab",
    };
  }

  const scripts = scriptsForUrl(tab.url);
  if (!scripts) {
    return { error: "This page is not a supported job board", url: tab.url };
  }

  let jobData;
  try {
    jobData = await chrome.tabs.sendMessage(tab.id, { type: "SCRAPE_JOB" });
  } catch {
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: scripts });
      await sleep(800);
      jobData = await chrome.tabs.sendMessage(tab.id, { type: "SCRAPE_JOB" });
    } catch (err) {
      return { error: err.message || "Could not read this page. Refresh the tab and try again." };
    }
  }

  if (jobData?.error) return jobData;
  if (!jobData?.jobTitle && !jobData?.jobDescription) {
    return { error: "No job listing detected on this page" };
  }

  await setPendingJobAndReconcile(jobData);
  chrome.runtime.sendMessage({ type: "JOB_DETECTED", payload: jobData }).catch(() => {});
  return jobData;
}

async function ensureOffscreenDocument() {
  if (await chrome.offscreen.hasDocument()) return;

  await chrome.offscreen.createDocument({
    url: OFFSCREEN_URL,
    reasons: ["DOM_SCRAPING"],
    justification: "Generate CV PDF for job application uploads",
  });
}

async function generatePdfOffscreen(payload) {
  await ensureOffscreenDocument();
  let html = payload.html?.trim() || payload.pdfLayoutHtml?.trim();
  if (!html) {
    html = await buildRenderedCvHtml({
      cvDocument: payload.cvDocument,
      tailoredCV: payload.tailoredCV,
      userProfile: payload.userProfile,
      pdfLayoutHtml: payload.pdfLayoutHtml,
      htmlOverride: payload.htmlOverride,
      useManualOverride: Boolean(
        payload.useManualOverride ?? (payload.htmlOverride && !payload.pdfLayoutHtml)
      ),
    });
  }
  const result = await chrome.runtime.sendMessage({
    type: "GENERATE_PDF_OFFSCREEN",
    payload: { html },
  });
  if (result?.error) throw new Error(result.error);
  return result.base64;
}

async function generateApplication(
  jobData,
  cvText,
  userProfile,
  preferences,
  linkedinProfileText = "",
  report = () => {}
) {
  const title = jobData.jobTitle || "Job listing";
  const company = jobData.company || jobData.platform || "Unknown";
  report(
    "validate",
    `${title} · ${company}`,
    `${jobData.platform || "web"}${jobData.url ? ` · ${safeHostname(jobData.url)}` : ""}`
  );

  report(
    "settings",
    `CV ${(cvText?.length || 0).toLocaleString()} chars`,
    linkedinProfileText?.trim()
      ? `LinkedIn export ${linkedinProfileText.length.toLocaleString()} chars`
      : "No LinkedIn PDF text"
  );

  const aiConfig = await getStorage("ai_config");
  const { allowed, remaining } = await canSubmitApplication();
  report(
    "license",
    allowed ? "Quota OK" : "Quota exceeded",
    remaining === Infinity ? "Pro — unlimited" : `${remaining} free applications left`
  );
  if (!allowed) {
    throw new Error("Free tier limit reached (15 applications). Upgrade to Pro.");
  }

  const promptBundle = buildApplicationPrompts({
    cvText,
    jobData,
    preferences,
    linkedinProfileText,
    userProfile,
  });
  const systemPrompt = promptBundle.systemPrompt;
  const userPrompt = promptBundle.userPrompt;

  const stats = formatPromptStats({
    cvText,
    linkedinText: linkedinProfileText,
    jobData,
    systemPrompt,
    userPrompt,
  });
  const screeningCount = jobData.screeningQuestions?.length || 0;
  report(
    "prompts",
    stats.summary,
    `${screeningCount} screening question${screeningCount === 1 ? "" : "s"} · cover letter: ${preferences?.coverLetterMode || "always"}`
  );

  const resolvedModel =
    aiConfig.provider === "anthropic"
      ? remapAnthropicModel(aiConfig.model)
      : aiConfig.model || "gpt-4o";
  report(
    "model",
    `${aiConfig.provider} / ${resolvedModel}`,
    `Profile: ${userProfile?.name || "not set"} · ${userProfile?.email || "no email"}`
  );

  report(
    "api",
    `Calling ${aiConfig.provider} API`,
    `Sending ~${stats.inputTotal.toLocaleString()} input tokens · max 8,192 output tokens`
  );

  const { text, usage, model: usedModel } = await callAI({
    provider: aiConfig.provider,
    apiKey: aiConfig.apiKey,
    model: aiConfig.model,
    systemPrompt,
    userPrompt,
    onApiProgress: (modelId, attempt, total) => {
      report(
        "api",
        `Waiting for ${modelId}…`,
        total > 1
          ? `Model attempt ${attempt}/${total} · typically 20–90 seconds`
          : "Typically 20–90 seconds — runs in the background"
      );
    },
  });

  const outputTokens = usage?.output_tokens ?? usage?.completion_tokens;
  report(
    "parse",
    `Received ${(text?.length || 0).toLocaleString()} characters from ${usedModel || resolvedModel}`,
    outputTokens
      ? `${outputTokens.toLocaleString()} output tokens`
      : "Validating JSON structure"
  );

  const parsed = parseApplicationResponse(text);
  const cost = costFromUsage(usage, aiConfig.provider, usedModel || aiConfig.model);
  return {
    ...parsed,
    applicationTitle: formatApplicationTitle(jobData, parsed.applicationTitle),
    usage,
    cost,
  };
}
