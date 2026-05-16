import { useState } from "react";
import { useJobQueue } from "../hooks/useJobQueue.js";
import { parseJobUrls } from "../lib/queue-utils.js";
import { getStorage, setStorage } from "../lib/storage.js";
import MatchScoreRing from "./MatchScoreRing.jsx";

const STATUS_LABELS = {
  pending: "Pending",
  processing: "Processing…",
  ready: "Ready to review",
  error: "Error",
};

export default function JobQueue({ onReviewItem }) {
  const { queue, processing, refresh } = useJobQueue();
  const [urlText, setUrlText] = useState("");
  const [invalid, setInvalid] = useState([]);

  const addUrls = async () => {
    const { urls, invalid: bad } = parseJobUrls(urlText);
    setInvalid(bad);
    if (urls.length === 0) return;

    const existing = (await getStorage("job_queue")) || [];
    await setStorage("job_queue", [...existing, ...urls]);
    setUrlText("");
    refresh();
  };

  const processQueue = async () => {
    await chrome.runtime.sendMessage({ type: "PROCESS_QUEUE" });
    refresh();
  };

  const clearQueue = async () => {
    await setStorage("job_queue", []);
    refresh();
  };

  const removeItem = async (id) => {
    const existing = (await getStorage("job_queue")) || [];
    await setStorage(
      "job_queue",
      existing.filter((i) => i.id !== id)
    );
    refresh();
  };

  const openReview = async (item) => {
    if (item.application) {
      await setStorage("pending_application", item.application);
      await setStorage("pending_job", item.jobData);
      onReviewItem?.(item.application, item.jobData);
    }
  };

  const pendingCount = queue.filter((i) => i.status === "pending").length;
  const readyCount = queue.filter((i) => i.status === "ready").length;

  return (
    <div className="space-y-3 max-h-[440px] overflow-y-auto">
      <section className="bg-white border rounded-lg p-3">
        <h2 className="text-xs font-semibold text-slate-500 uppercase mb-2">Bulk job queue</h2>
        <p className="text-xs text-slate-600 mb-2">
          Paste job URLs (one per line). Blitz opens each in the background, scrapes, and generates
          tailored applications for you to review.
        </p>
        <textarea
          value={urlText}
          onChange={(e) => setUrlText(e.target.value)}
          rows={4}
          placeholder="https://boards.greenhouse.io/...&#10;https://www.linkedin.com/jobs/view/..."
          className="w-full border rounded p-2 text-xs font-mono"
        />
        {invalid.length > 0 && (
          <p className="text-xs text-amber-700 mt-1">
            Skipped {invalid.length} invalid/unsupported line(s).
          </p>
        )}
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={addUrls}
            disabled={!urlText.trim()}
            className="flex-1 bg-blitz-600 text-white text-xs py-2 rounded disabled:opacity-50"
          >
            Add to queue
          </button>
          <button
            type="button"
            onClick={processQueue}
            disabled={processing || pendingCount === 0}
            className="flex-1 bg-slate-900 text-white text-xs py-2 rounded disabled:opacity-50"
          >
            {processing ? "Processing…" : `Process (${pendingCount})`}
          </button>
        </div>
      </section>

      {queue.length > 0 && (
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-600">
            {readyCount} ready · {pendingCount} pending · {queue.length} total
          </span>
          <button type="button" onClick={clearQueue} className="text-red-600 underline">
            Clear all
          </button>
        </div>
      )}

      <ul className="space-y-2">
        {queue.map((item) => (
          <li key={item.id} className="bg-white border rounded-lg p-3 text-xs">
            <div className="flex justify-between gap-2 mb-1">
              <span
                className={`font-medium capitalize ${
                  item.status === "ready"
                    ? "text-green-700"
                    : item.status === "error"
                      ? "text-red-600"
                      : "text-slate-600"
                }`}
              >
                {STATUS_LABELS[item.status] || item.status}
              </span>
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="text-slate-400 hover:text-red-600"
              >
                ×
              </button>
            </div>
            <p className="truncate text-slate-800 font-medium">
              {item.jobData?.jobTitle || item.url}
            </p>
            <p className="text-slate-500 truncate">{item.jobData?.company || item.platform}</p>
            {item.error && <p className="text-red-600 mt-1">{item.error}</p>}
            {item.application?.matchScore != null && (
              <div className="mt-2">
                <MatchScoreRing
                  score={item.application.matchScore}
                  size={56}
                  rationale={item.application.matchRationale}
                />
              </div>
            )}
            {item.status === "ready" && (
              <button
                type="button"
                onClick={() => openReview(item)}
                className="mt-2 w-full border border-blitz-600 text-blitz-700 py-1.5 rounded text-xs font-medium"
              >
                Review application
              </button>
            )}
          </li>
        ))}
      </ul>

      {queue.length === 0 && (
        <p className="text-center text-sm text-slate-500 py-4">Queue is empty.</p>
      )}
    </div>
  );
}

