const PLATFORM_PATTERNS = [
  { platform: "greenhouse", test: /greenhouse\.io/i },
  { platform: "linkedin", test: /linkedin\.com\/jobs/i },
  { platform: "indeed", test: /indeed\.(com|co\.uk)/i },
  { platform: "workday", test: /myworkdayjobs\.com/i },
  { platform: "lever", test: /jobs\.(eu\.)?lever\.co/i },
  { platform: "ashby", test: /jobs\.ashbyhq\.com/i },
];

export function detectPlatformFromUrl(url) {
  for (const { platform, test } of PLATFORM_PATTERNS) {
    if (test.test(url)) return platform;
  }
  return null;
}

export function isSupportedJobUrl(url) {
  if (!url || !/^https?:/i.test(url)) return false;
  return PLATFORM_PATTERNS.some(({ test }) => test.test(url));
}

export function isInternalAppUrl(url) {
  if (!url) return true;
  return (
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("about:") ||
    url.startsWith("edge://") ||
    url.startsWith("devtools://")
  );
}

export function parseJobUrls(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const urls = [];
  const invalid = [];

  for (const line of lines) {
    try {
      const url = new URL(line.startsWith("http") ? line : `https://${line}`);
      const platform = detectPlatformFromUrl(url.href);
      if (!platform) {
        invalid.push({ line, reason: "Unsupported platform" });
        continue;
      }
      urls.push({
        id: crypto.randomUUID(),
        url: url.href,
        platform,
        status: "pending",
        addedAt: new Date().toISOString(),
        jobData: null,
        application: null,
        error: null,
      });
    } catch {
      invalid.push({ line, reason: "Invalid URL" });
    }
  }

  return { urls, invalid };
}
