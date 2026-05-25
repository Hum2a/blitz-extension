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
    const host = window.location.hostname;
    if (host.includes("greenhouse.io")) return "greenhouse";
    if (host.includes("linkedin.com")) return "linkedin";
    if (host.includes("indeed.com") || host.includes("indeed.co.uk")) return "indeed";
    if (host.includes("myworkdayjobs.com")) return "workday";
    return null;
  }

  function isJobListingPage(platform) {
    if (platform === "greenhouse") {
      return Boolean(
        document.querySelector("h1.app-title") ||
          document.querySelector(".job-description") ||
          document.querySelector("#application_form") ||
          document.querySelector("form#application_form, form[action*='apply']")
      );
    }
    if (platform === "linkedin") {
      return Boolean(
        document.querySelector(".job-details-jobs-unified-top-card__job-title") ||
          document.querySelector(".jobs-unified-top-card__job-title") ||
          (window.location.pathname.includes("/jobs/view/") &&
            document.querySelector("h1"))
      );
    }
    if (platform === "indeed") {
      const onJobView =
        /viewjob/i.test(window.location.pathname + window.location.search) ||
        /[?&]jk=/i.test(window.location.search);
      return Boolean(
        onJobView ||
          document.querySelector("#jobDescriptionText") ||
          document.querySelector('[data-testid="jobDescriptionText"]') ||
          document.querySelector("h1.jobsearch-JobInfoHeader-title") ||
          document.querySelector('[data-testid="jobsearch-JobInfoHeader-title"]') ||
          document.querySelector(".jobsearch-JobComponent-description")
      );
    }
    if (platform === "workday") {
      return Boolean(
        document.querySelector('[data-automation-id="jobPostingHeader"]') ||
          document.querySelector('[data-automation-id="jobPostingDescription"]') ||
          /\/job\//i.test(window.location.pathname)
      );
    }
    return false;
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

  function reportJob(platform) {
    const jobData = scrapeCurrentJob(platform);
    if (jobData.error) return;
    chrome.runtime.sendMessage({ type: "JOB_DETECTED", payload: jobData });
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
  });

  function init() {
    const platform = detectPlatform();
    if (!platform || !isJobListingPage(platform)) return;

    const handler = PLATFORMS[platform]?.();
    if (!handler) {
      setTimeout(init, 300);
      return;
    }

    reportJob(platform);
  }

  function scheduleDetect() {
    setTimeout(init, 500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleDetect);
  } else {
    scheduleDetect();
  }

  // Indeed / SPAs update the job pane without full navigation
  let debounce;
  const observer = new MutationObserver(() => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      const platform = detectPlatform();
      if (platform && isJobListingPage(platform)) reportJob(platform);
    }, 1200);
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
