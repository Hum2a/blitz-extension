/**
 * Test helper mirroring content/ashby.js scrapeJob() DOM logic.
 */
export function scrapeAshbyFromDocument(doc) {
  const ldScripts = doc.querySelectorAll('script[type="application/ld+json"]');
  let ld = null;
  for (const script of ldScripts) {
    try {
      const raw = JSON.parse(script.textContent || "");
      if (raw["@type"] === "JobPosting") ld = raw;
    } catch {
      /* ignore */
    }
  }

  const company =
    ld?.hiringOrganization?.name ||
    doc.querySelector('meta[property="og:site_name"]')?.content?.trim() ||
    "";

  const jobTitle =
    doc.querySelector("h1")?.textContent?.trim() || ld?.title || "";

  const descEl = doc.querySelector('[data-testid="job-description"]');
  let jobDescription = descEl?.textContent?.trim() || "";
  if (!jobDescription && ld?.description) {
    jobDescription = ld.description.replace(/<[^>]+>/g, " ").trim();
  }

  return {
    platform: "ashby",
    jobTitle,
    company,
    jobDescription,
    externalApply: false,
  };
}
