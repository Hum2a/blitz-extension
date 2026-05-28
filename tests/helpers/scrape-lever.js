/**
 * Test helper mirroring content/lever.js scrapeJob() DOM logic.
 */
export function scrapeLeverFromDocument(doc) {
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
    doc.querySelector("[data-qa='posting-name']")?.textContent?.trim() ||
    doc.querySelector(".posting-headline h2")?.textContent?.trim() ||
    ld?.title ||
    "";

  const descEl =
    doc.querySelector("[data-qa='job-description']") ||
    doc.querySelector(".section.page .content");

  let jobDescription = descEl?.textContent?.trim() || "";
  if (!jobDescription && ld?.description) {
    jobDescription = ld.description.replace(/<[^>]+>/g, " ").trim();
  }

  const screeningQuestions = [];
  doc.querySelectorAll("form label").forEach((label) => {
    const text = label.textContent?.trim();
    if (text && text.length > 2 && text.length < 500) screeningQuestions.push(text);
  });

  return {
    platform: "lever",
    jobTitle,
    company,
    jobDescription,
    screeningQuestions: [...new Set(screeningQuestions)],
  };
}
