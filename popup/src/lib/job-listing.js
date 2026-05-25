/**
 * Tie pending applications (match score, review) to a specific job listing.
 */

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Stable id for a job listing (URL-first, then title + company).
 */
export function listingKey(job) {
  if (!job) return null;

  const url = job.url || job.jobData?.url;
  if (url) {
    try {
      const u = new URL(url);
      const host = u.hostname.toLowerCase();

      if (host.includes("indeed.")) {
        const jk = u.searchParams.get("jk") || u.searchParams.get("vjk");
        if (jk) return `indeed:jk:${jk}`;
      }

      const linkedInView = u.pathname.match(/\/jobs\/view\/(\d+)/i);
      if (linkedInView) return `linkedin:view:${linkedInView[1]}`;

      if (host.includes("greenhouse.io")) {
        return `greenhouse:${u.pathname}`;
      }

      if (host.includes("myworkdayjobs.com")) {
        return `workday:${u.origin}${u.pathname}`;
      }

      u.hash = "";
      ["utm_source", "utm_medium", "utm_campaign", "from", "ref"].forEach((p) =>
        u.searchParams.delete(p)
      );
      return `${u.origin}${u.pathname}?${u.searchParams.toString()}`.replace(/\?$/, "");
    } catch {
      return url.trim();
    }
  }

  const title = normalizeText(job.jobTitle || job.role);
  const company = normalizeText(job.company);
  const platform = job.platform || "";
  if (title || company) return `${platform}|${title}|${company}`;
  return null;
}

export function applicationMatchesJob(application, job) {
  if (!application || !job) return false;

  const appJob = application.jobData || {};
  const keyA = application.listingKey || listingKey(appJob);
  const keyB = listingKey(job);

  const titleA = normalizeText(appJob.jobTitle || application.role);
  const titleB = normalizeText(job.jobTitle);
  const companyA = normalizeText(appJob.company || application.company);
  const companyB = normalizeText(job.company);

  if (keyA && keyB && keyA === keyB) {
    if (titleA && titleB && titleA !== titleB) return false;
    if (companyA && companyB && companyA !== companyB) return false;
    return true;
  }

  if (titleA && titleB && companyA && companyB) {
    return titleA === titleB && companyA === companyB;
  }

  return false;
}

export function withListingKey(application, jobData) {
  if (!application) return application;
  const job = jobData || application.jobData || application;
  return {
    ...application,
    jobData: jobData || application.jobData,
    listingKey: listingKey(job),
  };
}
