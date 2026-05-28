/**
 * Jobs where Blitz can tailor CV/cover letter but cannot auto-fill the application form.
 */
export function isTailorOnlyJob(job = {}) {
  return Boolean(
    job.externalApply ||
    job.ashbyEmbedOnly ||
    (job.platform === "linkedin" && job.hasEasyApply === false)
  );
}

export function tailorOnlyHint(job = {}) {
  if (job.ashbyEmbedOnly) {
    return "Apply form is embedded — use Review to download your tailored CV and apply on jobs.ashbyhq.com.";
  }
  if (job.externalApply) {
    return "External apply — tailor with Blitz, then download your CV and apply on the company site.";
  }
  if (job.platform === "linkedin" && job.hasEasyApply === false) {
    return "No Easy Apply — tailor with Blitz and apply manually on LinkedIn.";
  }
  return "Tailor-only — download your documents from Review and apply manually.";
}
