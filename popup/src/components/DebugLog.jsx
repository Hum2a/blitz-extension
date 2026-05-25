import { useState, useEffect } from "react";
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-slate-500 underline w-full text-center py-1"
      >
        Show error log ({log.length})
      </button>
    );
  }

  const combined = log
    .map(
      (e) =>
        `[${e.at}] ${e.context}\n${e.message}${e.stack ? `\n${e.stack}` : ""}${e.extra && Object.keys(e.extra).length ? `\n${JSON.stringify(e.extra)}` : ""}`
    )
    .join("\n\n---\n\n");

  return (
    <div className="border-t pt-2 space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold text-slate-500">Error log</span>
        <div className="flex gap-2">
          <button type="button" onClick={refresh} className="text-xs underline">
            Refresh
          </button>
          <button
            type="button"
            onClick={async () => {
              await clearErrorLog();
              refresh();
            }}
            className="text-xs underline"
          >
            Clear
          </button>
          <button type="button" onClick={() => setOpen(false)} className="text-xs underline">
            Hide
          </button>
        </div>
      </div>
      {log.length === 0 ? (
        <p className="text-xs text-slate-500">No errors logged yet.</p>
      ) : (
        <ErrorPanel
          title="Recent errors"
          error={combined}
          onCopy={() => {}}
        />
      )}
    </div>
  );
}
