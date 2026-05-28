/** Content script bundles per job-board URL (used by background service worker). */

const BASE_SCRIPTS = [
  "content/page-context.js",
  "content/job-posting-jsonld.js",
  "content/humanise.js",
  "content/file-upload.js",
];

const TAIL_SCRIPTS = ["content/detector.js", "content/job-widget.js"];

export function scriptsForUrl(url) {
  const u = (url || "").toLowerCase();
  if (u.includes("greenhouse.io")) {
    return [...BASE_SCRIPTS, "content/greenhouse.js", ...TAIL_SCRIPTS];
  }
  if (u.includes("linkedin.com") && u.includes("/jobs")) {
    return [...BASE_SCRIPTS, "content/linkedin.js", ...TAIL_SCRIPTS];
  }
  if (u.includes("indeed.com") || u.includes("indeed.co.uk")) {
    return [...BASE_SCRIPTS, "content/indeed-helpers.js", "content/indeed.js", ...TAIL_SCRIPTS];
  }
  if (u.includes("myworkdayjobs.com")) {
    return [...BASE_SCRIPTS, "content/workday.js", ...TAIL_SCRIPTS];
  }
  if (u.includes("lever.co")) {
    return [...BASE_SCRIPTS, "content/lever.js", ...TAIL_SCRIPTS];
  }
  if (u.includes("ashbyhq.com")) {
    return [...BASE_SCRIPTS, "content/ashby.js", ...TAIL_SCRIPTS];
  }
  if (u.includes("bamboohr.com")) {
    return [...BASE_SCRIPTS, "content/bamboohr.js", ...TAIL_SCRIPTS];
  }
  return null;
}

export function safeHostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return String(url || "").slice(0, 40);
  }
}

/** Hostname-based platform id (mirrors content/detector.js). */
export function detectPlatformFromHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  if (host.includes("greenhouse.io")) return "greenhouse";
  if (host.includes("linkedin.com")) return "linkedin";
  if (host.includes("indeed.com") || host.includes("indeed.co.uk")) return "indeed";
  if (host.includes("myworkdayjobs.com")) return "workday";
  if (host.includes("lever.co")) return "lever";
  if (host.includes("ashbyhq.com")) return "ashby";
  if (host.includes("bamboohr.com")) return "bamboohr";
  return null;
}
