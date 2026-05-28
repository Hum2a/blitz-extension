import { isExtensionPage } from "./extension-env.js";
import { sendExtensionMessage } from "./extension-env.js";
import {
  addApplication,
  updateApplication,
  deleteApplication,
  getAllApplications,
} from "./db.js";

/** Safe summary for web dashboard (no CV/cover letter bodies). */
export function toHistorySummary(record) {
  if (!record) return null;
  return {
    id: record.id,
    listingKey: record.listingKey,
    applicationTitle: record.applicationTitle,
    company: record.company,
    role: record.role,
    url: record.url,
    platform: record.platform,
    status: record.status,
    matchScore: record.matchScore ?? null,
    matchRationale: record.matchRationale || "",
    generatedAt: record.generatedAt,
    updatedAt: record.updatedAt,
    appliedAt: record.appliedAt,
    notes: record.notes || "",
    events: (record.events || []).slice(0, 20),
    hasCv: Boolean(record.cvSnapshot?.trim()),
    hasCoverLetter: Boolean(record.coverLetterSnapshot?.trim()),
  };
}

export async function listApplicationsBridged() {
  if (isExtensionPage()) {
    return getAllApplications();
  }
  const res = await sendExtensionMessage({ type: "LIST_APPLICATION_HISTORY" });
  return res?.applications || [];
}

export async function addApplicationBridged(record) {
  if (isExtensionPage()) return addApplication(record);
  await sendExtensionMessage({ type: "SAVE_APPLICATION_HISTORY", payload: { record } });
  return record;
}

export async function updateApplicationBridged(id, patch) {
  if (isExtensionPage()) return updateApplication(id, patch);
  await sendExtensionMessage({ type: "PATCH_APPLICATION_HISTORY", payload: { id, patch } });
}

export async function deleteApplicationBridged(id) {
  if (isExtensionPage()) return deleteApplication(id);
  await sendExtensionMessage({ type: "DELETE_APPLICATION_HISTORY", payload: { id } });
}

export async function findHistoryMatchBridged(jobData) {
  if (!jobData) return null;
  if (isExtensionPage()) {
    const { findApplicationByJob } = await import("./application-store.js");
    const record = await findApplicationByJob(jobData);
    return record ? toHistorySummary(record) : null;
  }
  const res = await sendExtensionMessage({
    type: "GET_JOB_HISTORY_MATCH",
    payload: { jobData },
  });
  return res?.match || null;
}
