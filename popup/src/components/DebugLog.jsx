import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getErrorLog, clearErrorLog } from "../lib/runtime-messages.js";
import ErrorPanel from "./ErrorPanel.jsx";

export default function DebugLog() {
  const [log, setLog] = useState([]);
  const [open, setOpen] = useState(false);

  const refresh = async () => {
    setLog(await getErrorLog());
  };

  useEffect(() => {
    refresh();
  }, []);

  if (!open) {
    return (
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-slate-500 underline w-full text-center py-1"
        whileHover={{ scale: 1.02, color: "#3b5bdb" }}
      >
        Show error log ({log.length})
      </motion.button>
    );
  }

  const combined = log
    .map(
      (e) =>
        `[${e.at}] ${e.context}\n${e.message}${e.stack ? `\n${e.stack}` : ""}${e.extra && Object.keys(e.extra).length ? `\n${JSON.stringify(e.extra)}` : ""}`
    )
    .join("\n\n---\n\n");

  return (
    <motion.div
      className="border-t pt-2 space-y-2"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
    >
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold text-slate-500">Error log</span>
        <div className="flex gap-2">
          {["Refresh", "Clear", "Hide"].map((label, i) => (
            <motion.button
              key={label}
              type="button"
              onClick={async () => {
                if (label === "Refresh") refresh();
                else if (label === "Clear") {
                  await clearErrorLog();
                  refresh();
                } else setOpen(false);
              }}
              className="text-xs underline"
              whileHover={{ scale: 1.05 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              {label}
            </motion.button>
          ))}
        </div>
      </div>
      <AnimatePresence mode="wait">
        {log.length === 0 ? (
          <motion.p
            key="empty"
            className="text-xs text-slate-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            No errors logged yet.
          </motion.p>
        ) : (
          <motion.div key="log" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <ErrorPanel title="Recent errors" error={combined} onCopy={() => {}} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
