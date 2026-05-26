/** Testable Indeed URL helpers (mirrors content/indeed-helpers.js). */

export function isIndeedViewJobUrl(pathAndSearch) {
  const p = pathAndSearch || "";
  return (
    /viewjob/i.test(p) ||
    /\/rc\/clk/i.test(p) ||
    /indeedapply/i.test(p) ||
    /[?&]jk=/i.test(p) ||
    /[?&]vjk=/i.test(p)
  );
}

export function findJobPostingInJsonLd(data) {
  if (!data || typeof data !== "object") return null;
  const type = data["@type"];
  if (type === "JobPosting" || (Array.isArray(type) && type.includes("JobPosting"))) {
    return data;
  }
  if (Array.isArray(data)) {
    for (const child of data) {
      const found = findJobPostingInJsonLd(child);
      if (found) return found;
    }
  }
  if (Array.isArray(data["@graph"])) {
    for (const child of data["@graph"]) {
      const found = findJobPostingInJsonLd(child);
      if (found) return found;
    }
  }
  return null;
}
