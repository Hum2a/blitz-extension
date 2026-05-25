/** Persisted while the service worker runs AI generation (survives popup/tab close). */
export const GENERATION_STATUS_KEY = "generation_status";

export function idleGenerationStatus() {
  return { active: false };
}

/** Shallow snapshot of job fields needed for generation (no live tab required). */
export function snapshotJobForGeneration(jobData) {
  if (!jobData) return null;
  return {
    jobTitle: jobData.jobTitle,
    company: jobData.company,
    role: jobData.role,
    jobDescription: jobData.jobDescription,
    url: jobData.url,
    platform: jobData.platform,
    externalApply: jobData.externalApply,
    hasEasyApply: jobData.hasEasyApply,
    screeningQuestions: jobData.screeningQuestions,
    location: jobData.location,
    salary: jobData.salary,
    listingKey: jobData.listingKey,
  };
}

export function activeGenerationStatus(jobData, progress = null, source = "dashboard") {
  const snap = snapshotJobForGeneration(jobData);
  return {
    active: true,
    source,
    startedAt: new Date().toISOString(),
    jobTitle: snap?.jobTitle || "Job listing",
    company: snap?.company || snap?.platform || "",
    progress: progress || null,
    error: null,
  };
}

export function failedGenerationStatus(errorMessage, progress = null) {
  return {
    active: false,
    error: errorMessage,
    failedAt: new Date().toISOString(),
    progress,
  };
}
