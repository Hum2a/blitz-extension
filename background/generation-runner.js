import { getStorage, setStorage, getAllSettings } from "../popup/src/lib/storage.js";
import { assertGenerationAllowed } from "../popup/src/lib/generation-guards.js";
import { incrementDailyUsage } from "../popup/src/lib/daily-limit.js";
import { recordClientEvent } from "../popup/src/lib/telemetry.js";
import { buildApplicationPrompts } from "../popup/src/lib/prompts.js";
import {
  createProgressReporter,
  progressComplete,
  progressFromStage,
} from "../popup/src/lib/generation-progress.js";
import {
  activeGenerationStatus,
  failedGenerationStatus,
  idleGenerationStatus,
  snapshotJobForGeneration,
} from "../popup/src/lib/generation-status.js";

const KEEPALIVE_MS = 20_000;
const OFFSCREEN_URL = "offscreen/offscreen.html";

let keepAliveTimer = null;

async function ensureOffscreenForKeepAlive() {
  try {
    if (await chrome.offscreen.hasDocument()) return;
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_URL,
      reasons: ["DOM_SCRAPING"],
      justification: "Keep service worker alive during long AI generation",
    });
  } catch {
    /* offscreen optional */
  }
}

function startGenerationKeepAlive() {
  stopGenerationKeepAlive();
  keepAliveTimer = setInterval(() => {
    chrome.storage.local.set({ generation_keepalive_at: Date.now() }).catch(() => {});
    chrome.runtime.getPlatformInfo(() => {});
  }, KEEPALIVE_MS);
  ensureOffscreenForKeepAlive().catch(() => {});
}

export function stopGenerationKeepAlive() {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
}

async function setGenerationStatus(status) {
  await setStorage("generation_status", status);
}

async function broadcastProgress(payload) {
  chrome.runtime.sendMessage({ type: "GENERATION_PROGRESS", payload }).catch(() => {});
}

function createPersistedProgressReporter() {
  return (stageId, detail = "", subDetail = "") => {
    const payload = progressFromStage(stageId, detail, subDetail);
    broadcastProgress(payload);
    getStorage("generation_status").then((current) => {
      if (!current?.active) return;
      setGenerationStatus({ ...current, progress: payload }).catch(() => {});
    });
    return payload;
  };
}

export async function isGenerationRunning() {
  const status = await getStorage("generation_status");
  return Boolean(status?.active);
}

/**
 * Validate job + settings, snapshot job to storage, then run AI in the background.
 * Returns immediately with { started: true } so popup/tab can close.
 */
export async function startBackgroundGeneration({
  jobData,
  generateApplication,
  savePendingApplication,
  persistGeneratedApplication,
  logGenerateApiCall,
  setPendingJobAndReconcile,
  options = {},
}) {
  const { requirePromptPreflight = true, source = "dashboard", completeMessage } = options;

  if (await isGenerationRunning()) {
    return { error: "A generation is already in progress. Wait for it to finish or reopen Blitz to check status." };
  }

  const settings = await getAllSettings();
  if (!jobData?.jobTitle && !jobData?.jobDescription) {
    return { error: "No job detected. Open a supported job listing first." };
  }
  if (!settings.cv_text?.trim()) {
    return { error: "Add your CV in Settings first." };
  }

  try {
    await assertGenerationAllowed({
      source,
      action: source === "widget" ? "widget" : "generate",
    });
  } catch (err) {
    return { error: err.message };
  }

  if (requirePromptPreflight) {
    const preflight = buildApplicationPrompts({
      cvText: settings.cv_text,
      jobData,
      preferences: settings.preferences,
      linkedinProfileText: settings.linkedin_profile_text,
      userProfile: settings.user_profile,
    });
    if (!preflight.parts.includeBaseCv && !preflight.parts.includeJobDescription) {
      return {
        error:
          "Enable at least Base CV or Job listing under Settings → Prompt content (API cost).",
      };
    }
  }

  const snapshot = snapshotJobForGeneration(jobData);
  await setPendingJobAndReconcile(snapshot);
  const initialProgress = progressFromStage("validate", "Starting in background…");
  await setGenerationStatus(activeGenerationStatus(snapshot, initialProgress, source));
  broadcastProgress(initialProgress);

  startGenerationKeepAlive();

  const report = createPersistedProgressReporter();
  const doneMessage =
    completeMessage || "Application ready — open Blitz to review";

  (async () => {
    try {
      const result = await generateApplication(
        snapshot,
        settings.cv_text,
        settings.user_profile,
        settings.preferences,
        settings.linkedin_profile_text,
        report
      );
      await logGenerateApiCall(settings, snapshot, result, null);

      report(
        "save",
        `Match score ${result.matchScore}%`,
        result.cost ? `API cost ~$${result.cost.totalCostUsd?.toFixed(3)}` : ""
      );
      const completePayload = progressComplete(doneMessage);
      broadcastProgress(completePayload);

      const application = await savePendingApplication(result, snapshot);
      await persistGeneratedApplication(application, snapshot);
      await incrementDailyUsage();
      recordClientEvent("generate_completed", {
        platform: snapshot.platform || "unknown",
        tier: (await getStorage("license"))?.tier || "free",
        success: true,
        source,
      }).catch(() => {});
      await setGenerationStatus(idleGenerationStatus());
      chrome.runtime.sendMessage({ type: "APPLICATION_READY", payload: application }).catch(() => {});
    } catch (err) {
      const message = err.message || "Generation failed";
      recordClientEvent("generate_failed", {
        platform: snapshot.platform || "unknown",
        error_code: message.slice(0, 80),
        source,
      }).catch(() => {});
      await logGenerateApiCall(settings, snapshot, null, err);
      const status = await getStorage("generation_status");
      await setGenerationStatus(failedGenerationStatus(message, status?.progress));
      broadcastProgress(progressFromStage("api", message));
      chrome.runtime
        .sendMessage({ type: "GENERATION_FAILED", payload: { error: message } })
        .catch(() => {});
    } finally {
      stopGenerationKeepAlive();
    }
  })();

  return { started: true };
}
