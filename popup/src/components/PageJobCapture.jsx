import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sendRuntimeMessage } from "../lib/runtime-messages.js";
import { addQueueItems } from "../lib/queue-bridge.js";
import { useJobQueue } from "../hooks/useJobQueue.js";
import { Btn, Card, FadeUp } from "./motion.jsx";

function toQueueItems(jobs) {
  return jobs.map((job) => ({
    id: crypto.randomUUID(),
    url: job.url,
    platform: job.platform,
    status: "pending",
    addedAt: new Date().toISOString(),
    jobData: {
      jobTitle: job.jobTitle,
      company: job.company,
      url: job.url,
      platform: job.platform,
    },
    application: null,
    error: null,
  }));
}

export default function PageJobCapture({ compact = false }) {
  const { refresh } = useJobQueue();
  const [jobs, setJobs] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [scanning, setScanning] = useState(false);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const scanPage = async () => {
    setScanning(true);
    setError(null);
    setMessage(null);
    setJobs([]);
    setSelected(new Set());
    try {
      const result = await sendRuntimeMessage({ type: "LIST_PAGE_JOBS" });
      const list = result?.jobs || [];
      if (list.length === 0) {
        setError(result?.error || "No jobs found on this page.");
        return;
      }
      setJobs(list);
      setSelected(new Set(list.map((_, i) => i)));
      setMessage(`Found ${list.length} listing${list.length === 1 ? "" : "s"} on ${result.platform || "page"}.`);
    } catch (err) {
      setError(err.message || "Could not scan page");
    } finally {
      setScanning(false);
    }
  };

  const toggle = (index) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const addSelected = async () => {
    const picked = jobs.filter((_, i) => selected.has(i));
    if (picked.length === 0) return;
    setAdding(true);
    setError(null);
    try {
      const result = await addQueueItems(toQueueItems(picked));
      const dup = result?.duplicates?.length || 0;
      setMessage(
        `Added ${result?.added ?? picked.length} to queue${dup ? ` (${dup} duplicate${dup === 1 ? "" : "s"} skipped)` : ""}.`
      );
      refresh();
    } catch (err) {
      setError(err.message || "Could not add to queue");
    } finally {
      setAdding(false);
    }
  };

  return (
    <FadeUp>
      <Card
        className={`bg-white border rounded-xl shadow-sm ${compact ? "p-4" : "p-5"}`}
        delay={0}
        hover={false}
      >
        <h2 className="text-sm font-semibold text-slate-800">Capture from search page</h2>
        <p className="text-xs text-slate-600 mt-1 max-w-xl">
          On a LinkedIn or Indeed job search tab, scan visible listings and add them to the bulk
          queue in one step.
        </p>
        <Btn
          onClick={scanPage}
          disabled={scanning}
          className="mt-3 text-xs px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg disabled:opacity-50"
        >
          {scanning ? "Scanning active tab…" : "Scan search page"}
        </Btn>

        <AnimatePresence>
          {error && (
            <motion.p
              className="text-xs text-red-700 mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {error}
            </motion.p>
          )}
          {message && !error && (
            <motion.p
              className="text-xs text-slate-600 mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {message}
            </motion.p>
          )}
        </AnimatePresence>

        {jobs.length > 0 && (
          <div className="mt-3 space-y-2">
            <ul className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-slate-100 rounded-lg p-2">
              {jobs.map((job, index) => (
                <li key={`${job.url}-${index}`} className="flex items-start gap-2 text-xs">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={selected.has(index)}
                    onChange={() => toggle(index)}
                  />
                  <span className="min-w-0">
                    <span className="font-medium text-slate-800 block truncate">
                      {job.jobTitle || job.url}
                    </span>
                    {job.company && (
                      <span className="text-slate-500 truncate block">{job.company}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <Btn
              onClick={addSelected}
              disabled={adding || selected.size === 0}
              className="w-full text-xs py-2 bg-blitz-600 text-white rounded-lg disabled:opacity-50"
            >
              {adding ? "Adding…" : `Add ${selected.size} to queue`}
            </Btn>
          </div>
        )}
      </Card>
    </FadeUp>
  );
}
