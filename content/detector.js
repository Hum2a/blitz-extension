(function () {
  if (window.__blitzDetectorRan) return;
  window.__blitzDetectorRan = true;

  const PLATFORMS = {
    greenhouse: () => window.blitzGreenhouse,
    linkedin: () => window.blitzLinkedin,
    indeed: () => window.blitzIndeed,
    workday: () => window.blitzWorkday,
  };

  function detectPlatform() {
    return window.blitzPageContext?.detectPlatform?.() || null;
  }

  function scrapeCurrentJob(platform) {
    const handler = PLATFORMS[platform]?.();
    if (!handler?.scrapeJob) return { error: `No scraper for ${platform}` };
    const jobData = handler.scrapeJob();
    if (!jobData?.jobTitle && !jobData?.jobDescription) {
      return { error: "No job data found on page" };
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

  function reportJobIfReady(platform) {
    const context = window.blitzPageContext?.analyze?.() || { canCapture: false };
    if (!context.canCapture) {
      broadcastPageState(context, null);
      return;
    }

    const jobData = scrapeCurrentJob(platform);
    if (jobData.error) {
      broadcastPageState(context, null);
      return;
    }

    broadcastPageState(context, jobData);
    chrome.runtime.sendMessage({ type: "JOB_DETECTED", payload: jobData }).catch(() => {});
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleDetect);
  } else {
    scheduleDetect();
  }

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
