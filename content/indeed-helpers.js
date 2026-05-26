/**
 * Shared Indeed URL + JSON-LD helpers (content scripts, no ES imports).
 */
(function () {
  function isIndeedViewJobUrl(pathAndSearch) {
    const p = pathAndSearch || "";
    return (
      /viewjob/i.test(p) ||
      /\/rc\/clk/i.test(p) ||
      /indeedapply/i.test(p) ||
      /[?&]jk=/i.test(p) ||
      /[?&]vjk=/i.test(p)
    );
  }

  function stripHtml(html) {
    if (!html || typeof html !== "string") return "";
    try {
      const div = document.createElement("div");
      div.innerHTML = html;
      return div.innerText?.trim() || "";
    } catch {
      return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    }
  }

  function parseJobPostingJsonLd(root) {
    const doc = root || document;
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const raw = JSON.parse(script.textContent || "");
        const items = Array.isArray(raw) ? raw : [raw];
        for (const item of items) {
          const found = findJobPostingNode(item);
          if (found) return found;
        }
      } catch {
        /* ignore malformed JSON-LD */
      }
    }
    return null;
  }

  function findJobPostingNode(node) {
    if (!node || typeof node !== "object") return null;
    const type = node["@type"];
    if (type === "JobPosting" || (Array.isArray(type) && type.includes("JobPosting"))) {
      return node;
    }
    if (Array.isArray(node)) {
      for (const child of node) {
        const found = findJobPostingNode(child);
        if (found) return found;
      }
    }
    if (Array.isArray(node["@graph"])) {
      for (const child of node["@graph"]) {
        const found = findJobPostingNode(child);
        if (found) return found;
      }
    }
    return null;
  }

  const DESCRIPTION_SELECTORS = [
    "#jobDescriptionText",
    '[data-testid="jobDescriptionText"]',
    '[data-testid="jobsearch-JobDescription"]',
    ".jobsearch-JobComponent-description",
    "#job-details",
    '[id="jobDescriptionText"]',
    "#job-details-section",
    '[class*="jobDescription"]',
    '[data-testid="job-description"]',
    ".ia-JobDescription",
    "#ia-JobDescription",
  ];

  const TITLE_SELECTORS = [
    '[data-testid="jobsearch-JobInfoHeader-title"]',
    '[data-testid="jobsearch-JobInfoHeader-title"] span',
    '[data-testid="job-title"]',
    "h1.jobsearch-JobInfoHeader-title",
    ".jobsearch-JobInfoHeader-title",
    "#jobsearch-JobInfoHeader-title",
    "#ia-JobHeader-title",
    "main h1",
    "h1",
  ];

  window.blitzIndeedHelpers = {
    isIndeedViewJobUrl,
    stripHtml,
    parseJobPostingJsonLd,
    DESCRIPTION_SELECTORS,
    TITLE_SELECTORS,
  };
})();
