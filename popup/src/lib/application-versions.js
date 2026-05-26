import { applicationMatchesJob, withListingKey } from "./job-listing.js";

export const MAX_APPLICATION_VERSIONS = 20;

export const VERSION_SOURCES = {
  GENERATED: "generated",
  REGENERATED: "regenerated",
  MANUAL: "manual",
  RESTORED: "restored",
};

function versionLabelFor(source, createdAt) {
  const time = new Date(createdAt).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
  if (source === VERSION_SOURCES.REGENERATED) return `Regenerated · ${time}`;
  if (source === VERSION_SOURCES.MANUAL) return `Saved draft · ${time}`;
  if (source === VERSION_SOURCES.RESTORED) return `Restored · ${time}`;
  return `Generated · ${time}`;
}

function contentFingerprint(app) {
  const cv = (app?.tailoredCV || app?.cvSnapshot || "").trim();
  const cl = (app?.coverLetter || app?.coverLetterSnapshot || "").trim();
  const score = app?.matchScore ?? "";
  return `${cv.length}:${cv.slice(0, 80)}|${cl.length}:${cl.slice(0, 40)}|${score}`;
}

export function createVersionSnapshot(application, { source = VERSION_SOURCES.MANUAL, label } = {}) {
  const createdAt = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    createdAt,
    source,
    label: label || versionLabelFor(source, createdAt),
    tailoredCV: application?.tailoredCV || application?.cvSnapshot || "",
    coverLetter: application?.coverLetter || application?.coverLetterSnapshot || "",
    screeningAnswers: structuredClone(application?.screeningAnswers || []),
    matchScore: application?.matchScore ?? null,
    matchRationale: application?.matchRationale || "",
    cvDocument: application?.cvDocument ? structuredClone(application.cvDocument) : null,
    cost: application?.cost ? structuredClone(application.cost) : null,
    pdfLayoutHtml: application?.pdfLayoutHtml || null,
    pdfLayoutUpdatedAt: application?.pdfLayoutUpdatedAt || null,
    pdfHtmlOverride: application?.pdfHtmlOverride || null,
  };
}

export function archiveApplicationSnapshot(versions, application, options = {}) {
  if (!application) return versions || [];
  const snapshot = createVersionSnapshot(application, options);
  const list = [...(versions || [])];
  const last = list[list.length - 1];
  if (last && contentFingerprint(last) === contentFingerprint(snapshot)) {
    return list;
  }
  list.push(snapshot);
  return list.slice(-MAX_APPLICATION_VERSIONS);
}

/**
 * Merge user edits into application and append a version snapshot.
 */
export function archiveDraftToVersions(application, draft, options = {}) {
  if (!application) return application;
  const versions = archiveApplicationSnapshot(application.versions, application, {
    source: options.source || VERSION_SOURCES.MANUAL,
    label: options.label,
  });
  const merged = {
    ...application,
    tailoredCV: draft.tailoredCV ?? application.tailoredCV,
    coverLetter: draft.coverLetter ?? application.coverLetter,
    screeningAnswers: draft.screeningAnswers ?? application.screeningAnswers,
    pdfLayoutHtml: draft.pdfLayoutHtml ?? application.pdfLayoutHtml,
    pdfLayoutUpdatedAt: draft.pdfLayoutUpdatedAt ?? application.pdfLayoutUpdatedAt,
    pdfHtmlOverride: draft.pdfHtmlOverride ?? application.pdfHtmlOverride,
  };
  return { ...merged, versions, activeVersionId: null };
}

/**
 * After AI generation: keep prior pending app as a version, apply new result as current.
 */
export function integrateNewGeneration(prev, result, jobData) {
  let versions = [];

  if (prev && applicationMatchesJob(prev, jobData)) {
    versions = archiveApplicationSnapshot(
      prev.versions,
      prev,
      { source: VERSION_SOURCES.REGENERATED }
    );
  } else if (prev?.versions?.length) {
    versions = [...prev.versions];
  }

  const application = withListingKey(
    {
      ...result,
      jobData,
      versions,
      activeVersionId: null,
    },
    jobData
  );

  application.latestSnapshot = createVersionSnapshot(application, {
    source: VERSION_SOURCES.GENERATED,
    label: "Latest generation",
  });

  return application;
}

export function restoreLatestSnapshot(application) {
  if (!application?.latestSnapshot) return application;
  const versions = archiveApplicationSnapshot(application.versions, application, {
    source: VERSION_SOURCES.MANUAL,
    label: "Before restore",
  });
  const snap = application.latestSnapshot;
  return {
    ...application,
    versions,
    activeVersionId: null,
    tailoredCV: snap.tailoredCV,
    coverLetter: snap.coverLetter,
    screeningAnswers: structuredClone(snap.screeningAnswers || []),
    matchScore: snap.matchScore,
    matchRationale: snap.matchRationale,
    cvDocument: snap.cvDocument ? structuredClone(snap.cvDocument) : application.cvDocument,
    cost: snap.cost ? structuredClone(snap.cost) : application.cost,
    pdfLayoutHtml: snap.pdfLayoutHtml || null,
    pdfLayoutUpdatedAt: snap.pdfLayoutUpdatedAt || null,
    pdfHtmlOverride: snap.pdfHtmlOverride || null,
  };
}

export function applyVersionToApplication(application, versionId) {
  const version = (application?.versions || []).find((v) => v.id === versionId);
  if (!version) return application;

  const versions = archiveApplicationSnapshot(application.versions, application, {
    source: VERSION_SOURCES.MANUAL,
    label: "Before restore",
  });

  return {
    ...application,
    versions,
    activeVersionId: versionId,
    tailoredCV: version.tailoredCV,
    coverLetter: version.coverLetter,
    screeningAnswers: structuredClone(version.screeningAnswers || []),
    matchScore: version.matchScore,
    matchRationale: version.matchRationale,
    cvDocument: version.cvDocument ? structuredClone(version.cvDocument) : application.cvDocument,
    cost: version.cost ? structuredClone(version.cost) : application.cost,
    pdfLayoutHtml: version.pdfLayoutHtml || null,
    pdfLayoutUpdatedAt: version.pdfLayoutUpdatedAt || null,
    pdfHtmlOverride: version.pdfHtmlOverride || null,
  };
}

export function listVersions(application) {
  return [...(application?.versions || [])].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  );
}

export function mergeVersionsFromHistory(application, historyRecord) {
  if (!historyRecord?.versions?.length) return application;
  const merged = [...(historyRecord.versions || [])];
  for (const v of application?.versions || []) {
    if (!merged.some((m) => m.id === v.id)) merged.push(v);
  }
  return {
    ...application,
    versions: merged.slice(-MAX_APPLICATION_VERSIONS),
  };
}
