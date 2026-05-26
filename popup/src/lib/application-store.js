import {
  addApplication,
  updateApplication,
  getAllApplications,
  getApplicationByListingKey,
} from "./db.js";
import { listingKey } from "./job-listing.js";
import { displayApplicationLabel } from "./application-history-utils.js";
import { archiveApplicationSnapshot, VERSION_SOURCES } from "./application-versions.js";

export const HISTORY_EVENT_TYPES = {
  GENERATED: "generated",
  REGENERATED: "regenerated",
  FORM_FILLED: "form_filled",
  SUBMITTED: "submitted",
  STATUS_CHANGED: "status_changed",
};

export function findApplicationInList(applications, job) {
  const key = listingKey(job);
  if (!key || !applications?.length) return null;
  return applications.find((a) => a.listingKey === key) || null;
}

export async function findApplicationByJob(job) {
  const key = listingKey(job);
  if (!key) return null;
  return getApplicationByListingKey(key);
}

function appendEvent(existingEvents, type, detail) {
  const events = [...(existingEvents || [])];
  events.unshift({
    type,
    at: new Date().toISOString(),
    detail: detail || undefined,
  });
  return events.slice(0, 50);
}

export function buildHistoryRecord(application, jobData, options = {}) {
  const {
    status = "generated",
    eventType = HISTORY_EVENT_TYPES.GENERATED,
    existing = null,
  } = options;

  const job = jobData || application?.jobData || {};
  const now = new Date().toISOString();
  const key = listingKey(job);

  let versions = existing?.versions || [];

  if (
    existing?.cvSnapshot &&
    application?.tailoredCV &&
    existing.cvSnapshot.trim() !== application.tailoredCV.trim()
  ) {
    versions = archiveApplicationSnapshot(
      versions,
      {
        tailoredCV: existing.cvSnapshot,
        coverLetter: existing.coverLetterSnapshot,
        screeningAnswers: existing.screeningAnswers,
        matchScore: existing.matchScore,
        matchRationale: existing.matchRationale,
        cvDocument: existing.cvDocument,
      },
      { source: VERSION_SOURCES.REGENERATED }
    );
  }

  if (application?.versions?.length) {
    for (const v of application.versions) {
      if (!versions.some((x) => x.id === v.id)) versions.push(v);
    }
    versions = versions.slice(-20);
  }

  const record = {
    id: existing?.id || crypto.randomUUID(),
    listingKey: key,
    versions,
    applicationTitle: displayApplicationLabel({
      applicationTitle: application?.applicationTitle,
      role: job.jobTitle || application?.jobData?.jobTitle,
      company: job.company || application?.jobData?.company,
    }),
    company: job.company || application?.jobData?.company || "",
    role: job.jobTitle || application?.jobData?.jobTitle || "",
    url: job.url || application?.jobData?.url || "",
    platform: job.platform || application?.jobData?.platform || "",
    status: existing?.status === "applied" && status === "generated" ? "applied" : status,
    generatedAt: existing?.generatedAt || now,
    appliedAt: status === "applied" ? existing?.appliedAt || now : existing?.appliedAt || null,
    updatedAt: now,
    matchScore: application?.matchScore ?? existing?.matchScore ?? null,
    matchRationale: application?.matchRationale || existing?.matchRationale || "",
    cvSnapshot: application?.tailoredCV || existing?.cvSnapshot || "",
    coverLetterSnapshot: application?.coverLetter || existing?.coverLetterSnapshot || "",
    screeningAnswers: application?.screeningAnswers || existing?.screeningAnswers || [],
    jobData: {
      jobTitle: job.jobTitle,
      company: job.company,
      url: job.url,
      platform: job.platform,
    },
    events: appendEvent(existing?.events, eventType),
    latestSnapshot: application?.latestSnapshot || existing?.latestSnapshot || null,
  };

  return record;
}

/**
 * Save or update history when AI generates an application.
 */
export async function persistGeneratedApplication(application, jobData) {
  const key = listingKey(jobData);
  const existing = key ? await getApplicationByListingKey(key) : null;
  const eventType = existing
    ? HISTORY_EVENT_TYPES.REGENERATED
    : HISTORY_EVENT_TYPES.GENERATED;

  const record = buildHistoryRecord(application, jobData, {
    status: existing?.status === "applied" ? "applied" : "generated",
    eventType,
    existing,
  });

  if (existing) {
    return updateApplication(existing.id, record);
  }
  return addApplication(record);
}

/**
 * Mark history when user fills the form from Review.
 */
export async function persistFilledApplication(application, pendingJob, answers) {
  const key = listingKey(pendingJob || application?.jobData);
  const existing = key ? await getApplicationByListingKey(key) : null;
  const merged = {
    ...application,
    screeningAnswers: answers ?? application.screeningAnswers,
  };

  const record = buildHistoryRecord(merged, pendingJob || application?.jobData, {
    status: "applied",
    eventType: HISTORY_EVENT_TYPES.FORM_FILLED,
    existing,
  });

  let saved;
  if (existing) {
    saved = await updateApplication(existing.id, record);
  } else {
    saved = await addApplication(record);
  }
  try {
    const { onApplicationWritten } = await import("./sync-engine.js");
    await onApplicationWritten(saved?.id || record.id);
  } catch {
    /* sync optional */
  }
  return saved;
}

export async function appendHistoryEventForJob(job, type, detail) {
  const existing = await findApplicationByJob(job);
  if (!existing) return null;
  const saved = await updateApplication(existing.id, {
    events: appendEvent(existing.events, type, detail),
    updatedAt: new Date().toISOString(),
  });
  try {
    const { onApplicationWritten } = await import("./sync-engine.js");
    await onApplicationWritten(saved?.id || existing.id);
  } catch {
    /* sync optional */
  }
  return saved;
}

export async function loadApplicationIntoPending(record) {
  const job = {
    ...(record.jobData || {}),
    jobTitle: record.role || record.jobData?.jobTitle,
    company: record.company || record.jobData?.company,
    url: record.url || record.jobData?.url,
    platform: record.platform || record.jobData?.platform,
  };

  const application = {
    applicationTitle: record.applicationTitle,
    tailoredCV: record.cvSnapshot,
    coverLetter: record.coverLetterSnapshot,
    screeningAnswers: record.screeningAnswers || [],
    matchScore: record.matchScore,
    matchRationale: record.matchRationale,
    listingKey: record.listingKey,
    jobData: job,
    versions: record.versions || [],
    activeVersionId: null,
    latestSnapshot: record.latestSnapshot || null,
    cvDocument: record.cvDocument,
  };

  return { job, application };
}

export function formatHistoryEvent(type) {
  const labels = {
    [HISTORY_EVENT_TYPES.GENERATED]: "Generated",
    [HISTORY_EVENT_TYPES.REGENERATED]: "Regenerated",
    [HISTORY_EVENT_TYPES.FORM_FILLED]: "Form filled",
    [HISTORY_EVENT_TYPES.SUBMITTED]: "Submitted",
    [HISTORY_EVENT_TYPES.STATUS_CHANGED]: "Status updated",
  };
  return labels[type] || type;
}

export async function listApplicationsForTabLookup() {
  return getAllApplications();
}
