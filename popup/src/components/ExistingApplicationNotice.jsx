import { motion } from "framer-motion";
import { STATUS_LABELS, STATUS_STYLES, historyDisplayDate } from "../lib/application-history-utils.js";
import { Btn } from "./motion.jsx";

export default function ExistingApplicationNotice({
  record,
  hasPendingMatch,
  onReview,
  onViewHistory,
  onLoadFromHistory,
}) {
  if (!record) return null;

  const statusLabel = STATUS_LABELS[record.status] || record.status;
  const statusStyle = STATUS_STYLES[record.status] || STATUS_STYLES.generated;
  const when = historyDisplayDate(record);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 rounded-lg border border-violet-200 bg-violet-50/80 p-3 text-sm"
    >
      <p className="font-medium text-violet-900">
        {hasPendingMatch
          ? "Application ready for this listing"
          : "Already generated for this listing"}
      </p>
      <p className="text-xs text-violet-800/90 mt-1">
        {when && <span>{when}</span>}
        {when && statusLabel && <span> · </span>}
        {statusLabel && (
          <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] ${statusStyle}`}>
            {statusLabel}
          </span>
        )}
        {record.matchScore != null && (
          <span>
            {" "}
            · Match {record.matchScore}%
          </span>
        )}
      </p>
      <div className="flex flex-wrap gap-2 mt-2">
        {hasPendingMatch ? (
          <Btn
            onClick={onReview}
            className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700"
          >
            Review application
          </Btn>
        ) : (
          <Btn
            onClick={() => onLoadFromHistory?.(record)}
            className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700"
          >
            Load into review
          </Btn>
        )}
        {onViewHistory && (
          <button
            type="button"
            onClick={onViewHistory}
            className="text-xs text-violet-700 underline"
          >
            View in history
          </button>
        )}
      </div>
    </motion.div>
  );
}
