import { useMemo } from "react";
import { motion } from "framer-motion";
import { useApplications } from "../hooks/useApplications.js";
import {
  STATUS_LABELS,
  STATUS_STYLES,
  displayApplicationLabel,
} from "../lib/application-history-utils.js";
import { Card, FadeUp } from "./motion.jsx";

export default function RecentApplications({ onViewHistory, limit = 5 }) {
  const { applications, loading } = useApplications();

  const recent = useMemo(() => applications.slice(0, limit), [applications, limit]);

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
          {recent.map((app, i) => (
            <motion.li
              key={app.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between gap-2 text-sm py-1.5 border-b border-slate-100 last:border-0"
            >
              <div className="min-w-0">
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
            </motion.li>
          ))}
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
