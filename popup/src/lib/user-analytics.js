import {
  computeHistorySummary,
  STATUS_LABELS,
} from "./application-history-utils.js";
import { summarizeApiUsage, API_USAGE_TYPE_LABELS } from "./api-usage-log.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Calendar day in the user's local timezone (YYYY-MM-DD). */
export function localDayKey(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function lastNDays(n = 30) {
  const days = [];
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(end.getTime() - i * DAY_MS);
    days.push(localDayKey(d));
  }
  return days;
}

export function appDateKey(app) {
  const raw = app?.updatedAt || app?.generatedAt || app?.appliedAt;
  if (!raw) return null;
  return localDayKey(raw);
}

export function countByDay(items, dateFn, days = 30) {
  const keys = lastNDays(days);
  const counts = Object.fromEntries(keys.map((k) => [k, 0]));
  for (const item of items || []) {
    const key = dateFn(item);
    if (key && counts[key] !== undefined) counts[key] += 1;
  }
  return keys.map((day) => ({ day, count: counts[day] }));
}

export function sumByDay(items, dateFn, valueFn, days = 30) {
  const keys = lastNDays(days);
  const totals = Object.fromEntries(keys.map((k) => [k, 0]));
  for (const item of items || []) {
    const key = dateFn(item);
    if (key && totals[key] !== undefined) totals[key] += Number(valueFn(item)) || 0;
  }
  return keys.map((day) => ({ day, count: Math.round(totals[day] * 1_000_000) / 1_000_000 }));
}

export function groupCount(items, labelFn, { limit = 12, sortBy = "count" } = {}) {
  const map = new Map();
  for (const item of items || []) {
    const label = labelFn(item);
    if (!label) continue;
    map.set(label, (map.get(label) || 0) + 1);
  }
  let rows = [...map.entries()].map(([label, count]) => ({ label, count }));
  if (sortBy === "count") rows.sort((a, b) => b.count - a.count);
  else rows.sort((a, b) => a.label.localeCompare(b.label));
  if (limit > 0) rows = rows.slice(0, limit);
  return rows;
}

export function bucketMatchScores(applications) {
  const buckets = [
    { label: "0–49", min: 0, max: 49, count: 0 },
    { label: "50–69", min: 50, max: 69, count: 0 },
    { label: "70–84", min: 70, max: 84, count: 0 },
    { label: "85–100", min: 85, max: 100, count: 0 },
    { label: "No score", min: null, max: null, count: 0 },
  ];
  for (const app of applications || []) {
    const score = app?.matchScore;
    if (score == null || Number.isNaN(Number(score))) {
      buckets[4].count += 1;
      continue;
    }
    const n = Number(score);
    const b = buckets.find((x) => x.min != null && n >= x.min && n <= x.max);
    if (b) b.count += 1;
    else buckets[4].count += 1;
  }
  return buckets.map(({ label, count }) => ({ label, count }));
}

export function aggregateEventTypes(applications) {
  const map = new Map();
  for (const app of applications || []) {
    for (const ev of app.events || []) {
      map.set(ev.type, (map.get(ev.type) || 0) + 1);
    }
  }
  return [...map.entries()]
    .map(([type, count]) => ({ label: type, count }))
    .sort((a, b) => b.count - a.count);
}

export function averageMatchScore(applications) {
  const scored = (applications || []).filter((a) => a.matchScore != null && !Number.isNaN(Number(a.matchScore)));
  if (!scored.length) return null;
  const sum = scored.reduce((s, a) => s + Number(a.matchScore), 0);
  return Math.round((sum / scored.length) * 10) / 10;
}

export function buildApplicationsTableRows(applications, limit = 25) {
  return [...(applications || [])]
    .sort(
      (a, b) =>
        new Date(b.updatedAt || b.generatedAt || b.appliedAt) -
        new Date(a.updatedAt || a.generatedAt || a.appliedAt)
    )
    .slice(0, limit)
    .map((a) => ({
      id: a.id,
      title: a.applicationTitle || a.role || "—",
      company: a.company || "—",
      platform: a.platform || "—",
      status: STATUS_LABELS[a.status] || a.status || "—",
      match: a.matchScore != null ? String(a.matchScore) : "—",
      date: appDateKey(a) || "—",
    }));
}

export function aggregateApplicationAnalytics(applications) {
  const summary = computeHistorySummary(applications);
  const appliedApps = (applications || []).filter((a) => a.status === "applied" || a.appliedAt);

  return {
    summary: {
      ...summary,
      avgMatchScore: averageMatchScore(applications),
      withNotes: (applications || []).filter((a) => a.notes?.trim()).length,
      platformsUsed: new Set((applications || []).map((a) => a.platform).filter(Boolean)).size,
    },
    byStatus: groupCount(applications, (a) => STATUS_LABELS[a.status] || a.status || "Unknown", {
      limit: 0,
    }),
    byPlatform: groupCount(applications, (a) => a.platform || "Unknown"),
    byCompany: groupCount(applications, (a) => a.company || "Unknown"),
    applicationsByDay: countByDay(applications, appDateKey, 30),
    appliedByDay: countByDay(appliedApps, appDateKey, 30),
    matchScoreBuckets: bucketMatchScores(applications),
    eventsByType: aggregateEventTypes(applications),
    tableRows: buildApplicationsTableRows(applications),
  };
}

export function aggregateApiUsageAnalytics(records) {
  const summary = summarizeApiUsage(records);
  const successful = (records || []).filter((r) => r.success);

  return {
    summary,
    costByDay: sumByDay(successful, (r) => localDayKey(r.at), (r) => r.totalCostUsd || 0, 30),
    callsByDay: countByDay(records, (r) => localDayKey(r.at), 30),
    inputTokensByDay: sumByDay(successful, (r) => localDayKey(r.at), (r) => r.inputTokens || 0, 30),
    outputTokensByDay: sumByDay(successful, (r) => localDayKey(r.at), (r) => r.outputTokens || 0, 30),
    byProvider: groupCount(records, (r) => r.provider || "unknown"),
    byModel: groupCount(records, (r) => r.model || "unknown", { limit: 10 }),
    byPlatform: groupCount(records, (r) => r.platform || "—"),
    byType: groupCount(records, (r) => API_USAGE_TYPE_LABELS[r.type] || r.type || "other"),
    successVsFailed: [
      { label: "Success", count: summary.successCount },
      { label: "Failed", count: summary.failedCount },
    ].filter((x) => x.count > 0),
  };
}

export function mergeCloudDaySeries(localSeries, cloudSeries) {
  const map = new Map();
  for (const row of localSeries || []) map.set(row.day, { ...row });
  for (const row of cloudSeries || []) {
    const day = String(row.day).slice(0, 10);
    const prev = map.get(day) || { day, count: 0, cloud: 0 };
    prev.cloud = row.count ?? 0;
    map.set(day, prev);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
}
