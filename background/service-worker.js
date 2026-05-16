import { getStorage, setStorage, getAllSettings } from "../popup/src/lib/storage.js";
import { PROMPTS } from "../popup/src/lib/prompts.js";
import { callAI, parseApplicationResponse } from "../popup/src/lib/ai.js";
import {
  canSubmitApplication,
  incrementApplicationCount,
  checkLicenseStatus,
  validateLicense,
} from "../popup/src/lib/license.js";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse).catch((err) => {
    sendResponse({ error: err.message || "Unknown error" });
  });
  return true;
});

async function handleMessage(message, sender) {
  switch (message.type) {
    case "JOB_DETECTED":
      await setStorage("pending_job", message.payload);
      chrome.runtime.sendMessage({ type: "JOB_DETECTED", payload: message.payload }).catch(() => {});
      return { ok: true };

    case "GENERATE_APPLICATION": {
      const settings = await getAllSettings();
      const jobData = message.payload?.jobData || (await getStorage("pending_job"));
      if (!jobData) throw new Error("No job detected. Open a Greenhouse listing first.");
      if (!settings.cv_text?.trim()) throw new Error("Add your CV in Settings first.");

      const { allowed } = await canSubmitApplication();
      if (!allowed) {
        throw new Error("Free tier limit reached (15 applications). Upgrade to Pro.");
      }

      const result = await generateApplication(
        jobData,
        settings.cv_text,
        settings.user_profile,
        settings.preferences
      );

      const application = { ...result, jobData };
      await setStorage("pending_application", application);
      chrome.runtime.sendMessage({ type: "APPLICATION_READY", payload: application }).catch(() => {});
      return application;
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
      }
      return result;
    }

    case "GET_APPLICATION_COUNT": {
      const status = await checkLicenseStatus();
      const { allowed, remaining, used } = await canSubmitApplication();
      return { used, remaining, tier: status.tier, allowed };
    }

    case "FILL_FORM": {
      const application = await getStorage("pending_application");
      let tabId = sender.tab?.id || message.payload?.tabId;

      if (!tabId) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        tabId = tab?.id;
      }

      if (!tabId) throw new Error("No active tab for form fill");
      if (!application) throw new Error("No application to fill. Generate one first.");

      await chrome.tabs.sendMessage(tabId, {
        type: "FILL_FORM",
        payload: {
          tailoredCV: application.tailoredCV,
          coverLetter: application.coverLetter,
          screeningAnswers: application.screeningAnswers,
          userProfile: (await getAllSettings()).user_profile,
        },
      });

      return { ok: true };
    }

    case "APPLICATION_SUBMITTED": {
      await incrementApplicationCount();
      return { ok: true };
    }

    case "TEST_API_KEY": {
      const { provider, apiKey, model } = message.payload;
      const text = await callAI({
        provider,
        apiKey,
        model,
        systemPrompt: "Reply with exactly: OK",
        userPrompt: "Test",
      });
      return { ok: text.includes("OK") || text.length > 0 };
    }

    default:
      throw new Error(`Unknown message type: ${message.type}`);
  }
}

async function generateApplication(jobData, cvText, userProfile, preferences) {
  const aiConfig = await getStorage("ai_config");
  const systemPrompt = PROMPTS.system(userProfile);
  const userPrompt = PROMPTS.generateApplication(cvText, jobData, preferences);

  const raw = await callAI({
    provider: aiConfig.provider,
    apiKey: aiConfig.apiKey,
    model: aiConfig.model,
    systemPrompt,
    userPrompt,
  });

  return parseApplicationResponse(raw);
}
