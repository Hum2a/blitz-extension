/**
 * Test helper mirroring content/greenhouse.js scrapeJob() DOM logic.
 * Keep in sync when greenhouse scraper selectors change.
 */
export function scrapeGreenhouseFromDocument(doc) {
  const jobTitle =
    doc.querySelector("h1.app-title")?.textContent?.trim() ||
    doc.querySelector("h1")?.textContent?.trim() ||
    "";

  let company = "";
  const ogSite = doc.querySelector('meta[property="og:site_name"]');
  if (ogSite) company = ogSite.content;
  if (!company) {
    const titleParts = doc.title.split("|").map((s) => s.trim());
    company = titleParts.length > 1 ? titleParts[titleParts.length - 1] : titleParts[0];
  }

  const descEl =
    doc.querySelector("#content .job-description") ||
    doc.querySelector(".job-description") ||
    doc.querySelector("#content");
  const jobDescription = descEl?.innerText?.trim() || "";

  const screeningQuestions = [];
  doc.querySelectorAll("form label").forEach((label) => {
    const text = label.textContent?.trim();
    if (text && text.length > 2 && text.length < 500) {
      const forId = label.getAttribute("for");
      const input = forId
        ? doc.getElementById(forId)
        : label.querySelector("input, select, textarea");
      if (input && !["hidden", "submit", "file"].includes(input.type)) {
        screeningQuestions.push(text);
      }
    }
  });

  return {
    platform: "greenhouse",
    jobTitle,
    company,
    jobDescription,
    screeningQuestions: [...new Set(screeningQuestions)],
  };
}
