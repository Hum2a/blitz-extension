import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useApiUsage } from "../hooks/useApiUsage.js";
import { FadeUp, PulseDots, Btn, Card } from "./motion.jsx";
import { scrollPanelClass } from "../lib/layout.js";
import {
  summarizeApiUsage,
  usageRecordLabel,
  exportApiUsageToCsv,
  clearApiUsage,
  formatUsd,
  formatTokens,
  API_USAGE_TYPE_LABELS,
} from "../lib/api-usage-log.js";
import { useModal } from "../hooks/useModal.js";

function SummaryPill({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-center min-w-[4.5rem]">
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</p>
    </div>
  );
}

export default function ApiUsageHistory({ fullPage = false }) {
  const { records, loading, refresh } = useApiUsage();
  const { showConfirm } = useModal();
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState("all");

  const summary = useMemo(() => summarizeApiUsage(records), [records]);
  const filtered = useMemo(() => {
    if (filter === "all") return records;
    if (filter === "failed") return records.filter((r) => !r.success);
    return records.filter((r) => r.success);
  }, [records, filter]);

  const handleClear = async () => {
    const ok = await showConfirm("Delete all API usage history on this device?", {
      title: "Clear usage log",
      confirmLabel: "Clear",
      variant: "warning",
    });
    if (!ok) return;
    await clearApiUsage();
    await refresh();
  };

  if (loading) {
    return (
      <div className="py-12 flex justify-center">
        <PulseDots label="Loading API usage history…" />
      </div>
    );
  }

  return (
    <FadeUp
      className={`space-y-4 ${scrollPanelClass(fullPage, "max-h-[440px] overflow-y-auto pr-1")}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        {!fullPage && (
          <div>
            <h2 className="text-base font-bold text-slate-900">API usage</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Every AI API call Blitz makes (generate, regenerate, API test). Stored locally in
              your browser — not sent to Blitz servers.
            </p>
          </div>
        )}
        <div className="flex flex-wrap gap-2 ml-auto">
          <Btn
            onClick={() => exportApiUsageToCsv(records)}
            disabled={records.length === 0}
            className="text-xs border border-slate-300 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50"
          >
            Export CSV
          </Btn>
          <Btn
            onClick={handleClear}
            disabled={records.length === 0}
            className="text-xs border border-red-200 text-red-700 px-3 py-1.5 rounded-lg bg-white hover:bg-red-50 disabled:opacity-50"
          >
            Clear log
          </Btn>
        </div>
      </div>

      {records.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <SummaryPill label="Total spent" value={formatUsd(summary.totalCostUsd)} />
          <SummaryPill label="This week" value={formatUsd(summary.thisWeekCostUsd)} />
          <SummaryPill label="Calls" value={summary.totalCalls} />
          <SummaryPill label="Failed" value={summary.failedCount} />
        </div>
      )}

      {records.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {[
            ["all", `All (${records.length})`],
            ["success", `OK (${summary.successCount})`],
            ["failed", `Failed (${summary.failedCount})`],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`text-xs px-2.5 py-1 rounded-full border ${
                filter === id
                  ? "bg-blitz-600 text-white border-blitz-600"
                  : "bg-white text-slate-600 border-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {records.length === 0 ? (
        <Card className="bg-white border rounded-lg p-8 text-center" hover={false}>
          <p className="text-sm text-slate-600">
            No API calls logged yet. Generate an application or test your API key in Settings —
            each call will appear here with tokens and estimated cost.
          </p>
        </Card>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-6">No entries match this filter.</p>
      ) : (
        <ul className={fullPage ? "grid lg:grid-cols-2 gap-3 pb-4" : "space-y-2"}>
          <AnimatePresence initial={false}>
            {filtered.map((row, index) => (
              <motion.li
                key={row.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ delay: Math.min(index * 0.03, 0.3) }}
                className={`bg-white border rounded-lg p-3 shadow-sm ${
                  row.success ? "border-slate-200" : "border-red-200 bg-red-50/30"
                }`}
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                >
                  <div className="flex justify-between gap-2 items-start">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 text-sm truncate">
                        {usageRecordLabel(row)}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {API_USAGE_TYPE_LABELS[row.type] || row.type}
                        {" · "}
                        <span className="capitalize">{row.provider}</span>
                        {" · "}
                        <span className="font-mono text-[11px]">{row.model}</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(row.at).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                        {!row.success && (
                          <span className="text-red-700 font-medium"> · Failed</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-blitz-700 tabular-nums">
                        {row.success ? formatUsd(row.totalCostUsd) : "—"}
                      </p>
                      {row.success && (
                        <p className="text-[10px] text-slate-400 font-mono">
                          {formatTokens(row.inputTokens)} in / {formatTokens(row.outputTokens)} out
                        </p>
                      )}
                    </div>
                  </div>
                </button>
                <AnimatePresence>
                  {expandedId === row.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1"
                    >
                      {row.errorMessage && (
                        <p className="text-red-700">
                          <span className="font-semibold">Error:</span> {row.errorMessage}
                        </p>
                      )}
                      {row.success && (
                        <>
                          <p>
                            Input: {row.inputTokens.toLocaleString()} tokens (
                            {formatUsd(row.inputCostUsd)})
                          </p>
                          <p>
                            Output: {row.outputTokens.toLocaleString()} tokens (
                            {formatUsd(row.outputCostUsd)})
                          </p>
                        </>
                      )}
                      {row.url && (
                        <a
                          href={row.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blitz-600 underline block truncate"
                        >
                          {row.url}
                        </a>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </FadeUp>
  );
}
