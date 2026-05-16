(function () {
  if (window.__blitzDetectorRan) return;
  window.__blitzDetectorRan = true;

  function detectPlatform() {
    const host = window.location.hostname;
    if (host.includes("greenhouse.io")) return "greenhouse";
    if (host.includes("linkedin.com")) return "linkedin";
    if (host.includes("indeed.com")) return "indeed";
    if (host.includes("myworkdayjobs.com")) return "workday";
    return null;
  }

  function isJobListingPage(platform) {
    if (platform === "greenhouse") {
      return (
        document.querySelector("h1.app-title") ||
        document.querySelector(".job-description") ||
        document.querySelector("#application_form") ||
        document.querySelector("form#application_form, form[action*='apply']")
      );
    }
    return false;
  }

  function reportJob(platform) {
    let jobData = null;
    if (platform === "greenhouse" && window.blitzGreenhouse) {
      jobData = window.blitzGreenhouse.scrapeJob();
    }

    if (!jobData?.jobTitle && !jobData?.jobDescription) return;

    chrome.runtime.sendMessage({ type: "JOB_DETECTED", payload: jobData });
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "FILL_FORM" && window.blitzGreenhouse) {
      window.blitzGreenhouse
        .fillForm(message.payload)
        .then(() => sendResponse({ ok: true }))
        .catch((err) => sendResponse({ error: err.message }));
      return true;
    }
  });

  function init() {
    const platform = detectPlatform();
    if (!platform || !isJobListingPage(platform)) return;

    if (platform === "greenhouse" && !window.blitzGreenhouse) {
      setTimeout(init, 300);
      return;
    }

    reportJob(platform);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    setTimeout(init, 500);
  }
})();
