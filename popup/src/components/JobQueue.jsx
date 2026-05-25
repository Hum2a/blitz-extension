import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useJobQueue } from "../hooks/useJobQueue.js";
import { parseJobUrls } from "../lib/queue-utils.js";
import { getStorage, setStorage } from "../lib/storage.js";
import MatchScoreRing from "./MatchScoreRing.jsx";
import { Stagger, FadeUp, Card, Btn } from "./motion.jsx";

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
    <Stagger className="space-y-3 max-h-[440px] overflow-y-auto">
      <FadeUp>
        <Card className="bg-white border rounded-lg p-3" delay={0}>
          <h2 className="text-xs font-semibold text-slate-500 uppercase mb-2">Bulk job queue</h2>
          <p className="text-xs text-slate-600 mb-2">
            Paste job URLs (one per line). Blitz opens each in the background, scrapes, and generates
            tailored applications for you to review.
          </p>
          <motion.textarea
            value={urlText}
            onChange={(e) => setUrlText(e.target.value)}
            rows={4}
            placeholder="https://boards.greenhouse.io/...&#10;https://www.linkedin.com/jobs/view/..."
            className="w-full border rounded p-2 text-xs font-mono focus:ring-2 focus:ring-blitz-200"
            whileFocus={{ scale: 1.005 }}
          />
          <AnimatePresence>
            {invalid.length > 0 && (
              <motion.p
                className="text-xs text-amber-700 mt-1"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                Skipped {invalid.length} invalid/unsupported line(s).
              </motion.p>
            )}
          </AnimatePresence>
          <div className="flex gap-2 mt-2">
            <Btn
              onClick={addUrls}
              disabled={!urlText.trim()}
              className="flex-1 bg-blitz-600 text-white text-xs py-2 rounded disabled:opacity-50 btn-shine"
            >
              Add to queue
            </Btn>
            <Btn
              onClick={processQueue}
              disabled={processing || pendingCount === 0}
              className="flex-1 bg-slate-900 text-white text-xs py-2 rounded disabled:opacity-50 btn-shine"
            >
              {processing ? (
                <span className="inline-flex items-center gap-1 justify-center">
                  <motion.span
                    className="w-2 h-2 border border-white/50 border-t-white rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
                  />
                  Processing…
                </span>
              ) : (
                `Process (${pendingCount})`
              )}
            </Btn>
          </div>
        </Card>
      </FadeUp>

      <AnimatePresence>
        {queue.length > 0 && (
          <motion.div
            className="flex justify-between items-center text-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <span className="text-slate-600">
              {readyCount} ready · {pendingCount} pending · {queue.length} total
            </span>
            <motion.button
              type="button"
              onClick={clearQueue}
              className="text-red-600 underline"
              whileHover={{ scale: 1.05 }}
            >
              Clear all
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {queue.map((item, index) => (
            <motion.li
              key={item.id}
              layout
              initial={{ opacity: 0, x: -24, height: 0 }}
              animate={{ opacity: 1, x: 0, height: "auto" }}
              exit={{ opacity: 0, x: 24, height: 0, marginBottom: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30, delay: index * 0.03 }}
              className="bg-white border rounded-lg p-3 text-xs overflow-hidden"
              whileHover={{
                boxShadow: "0 8px 20px -6px rgba(47, 74, 196, 0.12)",
                borderColor: "#3b5bdb",
              }}
            >
              <div className="flex justify-between gap-2 mb-1">
                <motion.span
                  className={`font-medium capitalize ${
                    item.status === "ready"
                      ? "text-green-700"
                      : item.status === "error"
                        ? "text-red-600"
                        : item.status === "processing"
                          ? "text-blitz-600"
                          : "text-slate-600"
                  }`}
                  animate={
                    item.status === "processing"
                      ? { opacity: [1, 0.5, 1] }
                      : { opacity: 1 }
                  }
                  transition={
                    item.status === "processing"
                      ? { repeat: Infinity, duration: 1.2 }
                      : {}
                  }
                >
                  {STATUS_LABELS[item.status] || item.status}
                </motion.span>
                <motion.button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="text-slate-400 hover:text-red-600"
                  whileHover={{ scale: 1.2, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  ×
                </motion.button>
              </div>
              <p className="truncate text-slate-800 font-medium">
                {item.jobData?.jobTitle || item.url}
              </p>
              <p className="text-slate-500 truncate">{item.jobData?.company || item.platform}</p>
              {item.error && (
                <motion.p
                  className="text-red-600 mt-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {item.error}
                </motion.p>
              )}
              {item.application?.matchScore != null && (
                <div className="mt-2">
                  <MatchScoreRing
                    score={item.application.matchScore}
                    size={56}
                    rationale={item.application.matchRationale}
                  />
                </div>
              )}
              <AnimatePresence>
                {item.status === "ready" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <Btn
                      onClick={() => openReview(item)}
                      className="mt-2 w-full border border-blitz-600 text-blitz-700 py-1.5 rounded text-xs font-medium bg-white"
                    >
                      Review application
                    </Btn>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <AnimatePresence>
        {queue.length === 0 && (
          <motion.p
            className="text-center text-sm text-slate-500 py-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            Queue is empty.
          </motion.p>
        )}
      </AnimatePresence>
    </Stagger>
  );
}
