(function () {
  if (window.__blitzDetectorRan) return;
  window.__blitzDetectorRan = true;

  const PLATFORMS = {
    greenhouse: () => window.blitzGreenhouse,
    linkedin: () => window.blitzLinkedin,
    indeed: () => window.blitzIndeed,
    workday: () => window.blitzWorkday,
  };

  function detectPlatformFromHost() {
    const host = window.location.hostname;
    if (host.includes("greenhouse.io")) return "greenhouse";
    if (host.includes("linkedin.com")) return "linkedin";
    if (host.includes("indeed.com") || host.includes("indeed.co.uk")) return "indeed";
    if (host.includes("myworkdayjobs.com")) return "workday";
    return null;
  }

  function detectPlatform() {
    return window.blitzPageContext?.detectPlatform?.() || detectPlatformFromHost();
  }

  function scrapeCurrentJob(platform) {
    const handler = PLATFORMS[platform]?.();
    if (!handler?.scrapeJob) return { error: `No scraper for ${platform}` };
    const jobData = handler.scrapeJob();
    if (!jobData?.jobTitle && !jobData?.jobDescription) {
      return { error: "No job data found on page — wait for the listing to load, then Refresh" };
    }
    return jobData;
  }

  function broadcastPageState(context, jobData) {
    window.blitzJobWidget?.update(context, jobData ?? null);
    chrome.runtime
      .sendMessage({
        type: "BLITZ_PAGE_STATE",
        payload: { context, jobData: jobData?.error ? null : jobData },
      })
      .catch(() => {});
  }

  let indeedDescriptionRetryTimer = null;

  function reportJobIfReady(platform) {
    const context = window.blitzPageContext?.analyze?.() || { canCapture: false };
    if (!context.canCapture) {
      broadcastPageState(context, null);
      return;
    }

    const jobData = scrapeCurrentJob(platform);
    if (jobData.error) {
      broadcastPageState(context, null);
      if (platform === "indeed") scheduleIndeedDescriptionRetry();
      return;
    }

    broadcastPageState(context, jobData);
    chrome.runtime.sendMessage({ type: "JOB_DETECTED", payload: jobData }).catch(() => {});

    if (
      platform === "indeed" &&
      jobData.jobTitle &&
      !(jobData.jobDescription || "").trim()
    ) {
      scheduleIndeedDescriptionRetry();
    }
  }

  function scheduleIndeedDescriptionRetry() {
    if (indeedDescriptionRetryTimer) return;
    let attempts = 0;
    indeedDescriptionRetryTimer = setInterval(() => {
      attempts += 1;
      const context = window.blitzPageContext?.analyze?.() || { canCapture: false };
      if (!context.canCapture) {
        clearInterval(indeedDescriptionRetryTimer);
        indeedDescriptionRetryTimer = null;
        return;
      }
      const jobData = scrapeCurrentJob("indeed");
      if (!jobData.error && (jobData.jobDescription || "").trim().length > 60) {
        broadcastPageState(context, jobData);
        chrome.runtime.sendMessage({ type: "JOB_DETECTED", payload: jobData }).catch(() => {});
        clearInterval(indeedDescriptionRetryTimer);
        indeedDescriptionRetryTimer = null;
        return;
      }
      if (attempts >= 12) {
        clearInterval(indeedDescriptionRetryTimer);
        indeedDescriptionRetryTimer = null;
      }
    }, 800);
  }

  async function routeFillForm(payload) {
    const platform = detectPlatform();
    const handler = PLATFORMS[platform]?.();
    if (!handler?.fillForm) {
      throw new Error(`Form fill not supported for platform: ${platform || "unknown"}`);
    }
    await handler.fillForm(payload);
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "SCRAPE_JOB") {
      const platform = detectPlatform();
      if (!platform) {
        sendResponse({ error: "Unsupported page" });
        return true;
      }
      sendResponse(scrapeCurrentJob(platform));
      return true;
    }
    if (message.type === "FILL_FORM") {
      routeFillForm(message.payload)
        .then(() => sendResponse({ ok: true }))
        .catch((err) => sendResponse({ error: err.message }));
      return true;
    }
    if (message.type === "GET_TAB_JOB_INFO") {
      const platform = detectPlatform();
      const context = window.blitzPageContext?.analyze?.() || null;
      let jobData = null;
      if (platform && context?.canCapture) {
        jobData = scrapeCurrentJob(platform);
      }
      sendResponse({ context, jobData, platform });
      return true;
    }
    if (message.type === "WIDGET_REFRESH_JOB") {
      const platform = detectPlatform();
      const context = window.blitzPageContext?.analyze?.() || null;
      if (!platform) {
        sendResponse({ context, error: "Unsupported page" });
        return true;
      }
      if (!context.canCapture) {
        broadcastPageState(context, null);
        sendResponse({ context, jobData: null });
        return true;
      }
      const jobData = scrapeCurrentJob(platform);
      if (!jobData.error) {
        chrome.runtime.sendMessage({ type: "JOB_DETECTED", payload: jobData }).catch(() => {});
      }
      broadcastPageState(context, jobData.error ? null : jobData);
      sendResponse({ context, jobData, error: jobData.error });
      return true;
    }
  });

  function init() {
    const platform = detectPlatform();
    if (!platform) return;

    const handler = PLATFORMS[platform]?.();
    if (!handler) {
      setTimeout(init, 300);
      return;
    }

    const context = window.blitzPageContext?.analyze?.();
    if (!context) return;

    broadcastPageState(context, null);
    reportJobIfReady(platform);
  }

  function scheduleDetect() {
    setTimeout(init, 500);
  }

  function onSpaNavigate() {
    const platform = detectPlatform();
    if (!platform) return;
    const handler = PLATFORMS[platform]?.();
    if (!handler?.scrapeJob) {
      setTimeout(onSpaNavigate, 300);
      return;
    }
    const context = window.blitzPageContext?.analyze?.();
    if (context) broadcastPageState(context, null);
    reportJobIfReady(platform);
    window.blitzJobWidget?.onNavigate?.();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleDetect);
  } else {
    scheduleDetect();
  }

  window.blitzPageContext?.watchSpaNavigation?.(onSpaNavigate);

  let debounce;
  const observer = new MutationObserver(() => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      const platform = detectPlatform();
      if (!platform) return;
      reportJobIfReady(platform);
    }, 1200);
  });
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }
})();
