import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApplications } from "../hooks/useApplications.js";
import {
  STATUS_LABELS,
  STATUS_STYLES,
  displayApplicationLabel,
} from "../lib/application-history-utils.js";
import { Card, FadeUp } from "./motion.jsx";
import { useModal } from "../hooks/useModal.js";

export default function RecentApplications({ onViewHistory, limit = 5 }) {
  const { applications, loading, removeApplication } = useApplications();
  const { showConfirm } = useModal();
  const [deletingId, setDeletingId] = useState(null);

  const recent = useMemo(() => applications.slice(0, limit), [applications, limit]);

  const handleDelete = async (app, event) => {
    event.preventDefault();
    event.stopPropagation();
    const label = displayApplicationLabel(app);
    const ok = await showConfirm(
      `Remove "${label}" from your application history? This cannot be undone.`,
      {
        title: "Delete application",
        confirmLabel: "Delete",
        variant: "warning",
      }
    );
    if (!ok) return;
    setDeletingId(app.id);
    try {
      await removeApplication(app.id);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading || applications.length === 0) {
    return null;
  }

  return (
    <FadeUp delay={0.2}>
      <Card className="bg-white rounded-lg border border-slate-200 p-4" delay={0} hover={false}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Recent applications
          </h2>
          <button
            type="button"
            onClick={onViewHistory}
            className="text-xs text-blitz-600 font-medium hover:underline"
          >
            View all history →
          </button>
        </div>
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {recent.map((app, i) => (
              <motion.li
                key={app.id}
                layout
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12, height: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between gap-2 text-sm py-1.5 border-b border-slate-100 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900 truncate">{displayApplicationLabel(app)}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {[app.company, app.role].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border capitalize ${STATUS_STYLES[app.status] || STATUS_STYLES.applied}`}
                >
                  {STATUS_LABELS[app.status] || app.status}
                </span>
                <button
                  type="button"
                  onClick={(e) => handleDelete(app, e)}
                  disabled={deletingId === app.id}
                  className="shrink-0 text-slate-400 hover:text-red-600 disabled:opacity-40 p-1 rounded hover:bg-red-50 transition-colors"
                  title="Delete from history"
                  aria-label={`Delete ${displayApplicationLabel(app)}`}
                >
                  {deletingId === app.id ? (
                    <span className="inline-block w-3.5 h-3.5 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                  ) : (
                    <span className="text-base leading-none" aria-hidden>
                      ×
                    </span>
                  )}
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        {applications.length > limit && (
          <p className="text-xs text-slate-400 mt-2 text-center">
            +{applications.length - limit} more in History
          </p>
        )}
      </Card>
    </FadeUp>
  );
}
