import { listingKey } from "./job-listing.js";

/** Normalize job URLs for queue deduplication (strip tracking params, /apply suffix). */
export function normalizeQueueUrl(url) {
  try {
    const u = new URL(url);
    u.hash = "";
    ["utm_source", "utm_medium", "utm_campaign", "from", "ref"].forEach((p) =>
      u.searchParams.delete(p)
    );
    let path = u.pathname.replace(/\/+$/, "") || "/";
    if (/\/apply$/i.test(path)) {
      path = path.replace(/\/apply$/i, "") || "/";
    }
    const search = u.searchParams.toString();
    return `${u.origin}${path}${search ? `?${search}` : ""}`;
  } catch {
    return String(url || "").trim();
  }
}

export function queueItemDedupeKey(item) {
  const url = normalizeQueueUrl(item?.url) || item?.url;
  const fromJob = listingKey(
    item?.jobData ? { ...item.jobData, url: item.jobData.url || url } : { url }
  );
  if (fromJob) return `listing:${fromJob}`;
  return url ? `url:${url}` : null;
}

/**
 * Filter new queue items against existing queue + application history.
 */
export function dedupeQueueAdditions(newItems, existingQueue = [], historyRecords = []) {
  const keys = new Set();
  const duplicates = [];
  const accepted = [];

  const remember = (item) => {
    const key = queueItemDedupeKey(item);
    if (key) keys.add(key);
  };

  for (const item of existingQueue) remember(item);
  for (const record of historyRecords) {
    if (record?.listingKey) keys.add(`listing:${record.listingKey}`);
  }

  const seenIncoming = new Set();

  for (const item of newItems) {
    const key = queueItemDedupeKey(item);
    if (key && seenIncoming.has(key)) {
      duplicates.push({ url: item.url, reason: "Duplicate in pasted list" });
      continue;
    }
    if (key) seenIncoming.add(key);

    if (key && keys.has(key)) {
      const lk = listingKey(item?.jobData || { url: item?.url });
      const inHistory =
        (lk && historyRecords.some((r) => r.listingKey === lk)) ||
        historyRecords.some(
          (r) => normalizeQueueUrl(r.url) === normalizeQueueUrl(item?.url)
        );
      duplicates.push({
        url: item.url,
        reason: inHistory ? "Already in application history" : "Already in queue",
      });
      continue;
    }

    if (key) keys.add(key);
    accepted.push({
      ...item,
      url: normalizeQueueUrl(item.url) || item.url,
    });
  }

  return { accepted, duplicates };
}
