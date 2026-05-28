/**
 * Shared JobPosting JSON-LD parsing (content scripts, no ES imports).
 */
(function () {
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
        /* ignore */
      }
    }
    return null;
  }

  window.blitzJobPostingJsonLd = { parseJobPostingJsonLd, stripHtml, findJobPostingNode };
})();
