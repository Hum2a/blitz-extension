import { useState, useMemo, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useApplications } from "../hooks/useApplications.js";
import MatchScoreRing from "./MatchScoreRing.jsx";
import { FadeUp, PulseDots, Btn, Card } from "./motion.jsx";
import {
  APPLICATION_STATUSES,
  STATUS_LABELS,
  STATUS_STYLES,
  exportApplicationsToCsv,
  computeHistorySummary,
  filterApplications,
  displayApplicationLabel,
} from "../lib/application-history-utils.js";
import { scrollPanelClass } from "../lib/layout.js";

function SummaryPill({ label, value, highlight }) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-center min-w-[4.5rem] ${
        highlight ? "bg-blitz-50 border-blitz-200" : "bg-white border-slate-200"
      }`}
    >
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</p>
    </div>
  );
}

function ApplicationDetail({ app, updateNotes }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-2"
    >
      <a href={app.url} target="_blank" rel="noreferrer" className="text-blitz-600 underline">
        View original listing
      </a>
      <label className="block">
        <span className="font-semibold text-slate-700">Notes</span>
        <textarea
          defaultValue={app.notes || ""}
          onBlur={(e) => updateNotes(app.id, e.target.value)}
          rows={2}
          className="w-full border rounded p-2 mt-1 focus:ring-1 focus:ring-blitz-300"
        />
      </label>
      {app.cvSnapshot && (
        <div>
          <p className="font-semibold text-slate-700 mb-1">CV snapshot</p>
          <pre className="whitespace-pre-wrap max-h-28 overflow-y-auto bg-slate-50 p-2 rounded text-[11px]">
            {app.cvSnapshot.slice(0, 600)}
            {app.cvSnapshot.length > 600 ? "…" : ""}
          </pre>
        </div>
      )}
      {app.coverLetterSnapshot && (
        <div>
          <p className="font-semibold text-slate-700 mb-1">Cover letter</p>
          <pre className="whitespace-pre-wrap max-h-24 overflow-y-auto bg-slate-50 p-2 rounded text-[11px]">
            {app.coverLetterSnapshot.slice(0, 400)}
            {app.coverLetterSnapshot.length > 400 ? "…" : ""}
          </pre>
        </div>
      )}
      {app.screeningAnswers?.length > 0 && (
        <div>
          <p className="font-semibold text-slate-700 mb-1">Screening Q&A</p>
          <ul className="space-y-1">
            {app.screeningAnswers.map((qa, i) => (
              <li key={i} className="bg-slate-50 p-2 rounded">
                <span className="font-medium text-slate-800">{qa.question}</span>
                <p className="mt-0.5 text-slate-600">{qa.answer}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}

export default function ApplicationHistory({ fullPage = false }) {
  const { applications, loading, refresh, updateStatus, updateNotes } = useApplications();
  const [expandedId, setExpandedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    refresh();
  }, [refresh]);

  const summary = useMemo(() => computeHistorySummary(applications), [applications]);
  const filtered = useMemo(
    () => filterApplications(applications, { statusFilter, search }),
    [applications, statusFilter, search]
  );

  if (loading) {
    return (
      <div className="py-12 flex justify-center">
        <PulseDots label="Loading application history…" />
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
            <h2 className="text-base font-bold text-slate-900">Application history</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Every role you applied to through Blitz — CV snapshots, cover letters, and status.
            </p>
          </div>
        )}
        <Btn
          onClick={() => exportApplicationsToCsv(applications)}
          disabled={applications.length === 0}
          className={`text-xs border border-slate-300 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50 ${fullPage ? "ml-auto" : ""}`}
        >
          Export CSV
        </Btn>
      </div>

      {applications.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-between items-center">
          <SummaryPill label="Total" value={summary.total} highlight />
          <SummaryPill label="This week" value={summary.thisWeek} />
          <SummaryPill label="Interviews" value={summary.interviews} />
          <SummaryPill label="Offers" value={summary.offers} />
          <SummaryPill label="Response %" value={`${summary.responseRate}%`} />
        </div>
      )}

      {applications.length > 0 && (
        <Card className="bg-white border rounded-lg p-3 space-y-2" delay={0.05} hover={false}>
          <input
            type="search"
            placeholder="Search title, company, role, platform…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blitz-200"
          />
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`text-xs px-2.5 py-1 rounded-full border ${
                statusFilter === "all"
                  ? "bg-blitz-600 text-white border-blitz-600"
                  : "bg-white text-slate-600 border-slate-200"
              }`}
            >
              All ({applications.length})
            </button>
            {APPLICATION_STATUSES.map((s) => {
              const count = applications.filter((a) => a.status === s).length;
              if (count === 0 && statusFilter !== s) return null;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`text-xs px-2.5 py-1 rounded-full border capitalize ${
                    statusFilter === s
                      ? STATUS_STYLES[s]
                      : "bg-white text-slate-600 border-slate-200"
                  }`}
                >
                  {STATUS_LABELS[s]} ({count})
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {applications.length === 0 ? (
        <Card className="bg-white border rounded-lg p-8 text-center" hover={false}>
          <p className="text-sm text-slate-600">
            No applications logged yet. Generate and approve an application on a job page to
            start your history.
          </p>
        </Card>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-6">No applications match your filters.</p>
      ) : (
        <ul className={fullPage ? "grid lg:grid-cols-2 gap-3 pb-4" : "space-y-2"}>
          <AnimatePresence initial={false}>
            {filtered.map((app, index) => (
              <motion.li
                key={app.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ delay: Math.min(index * 0.03, 0.3) }}
                className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm hover:border-blitz-300 transition-colors"
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                >
                  <div className="flex gap-3 items-start">
                    <div className="shrink-0 pt-0.5">
                      <MatchScoreRing score={app.matchScore} size={44} showLabel={false} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900 truncate">
                          {displayApplicationLabel(app)}
                        </p>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full border capitalize ${STATUS_STYLES[app.status] || STATUS_STYLES.applied}`}
                        >
                          {STATUS_LABELS[app.status] || app.status}
                        </span>
                      </div>
                      {(app.company || app.role) && (
                        <p className="text-sm text-slate-600 truncate">
                          {[app.company, app.role].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(app.appliedAt).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                        {" · "}
                        <span className="capitalize">{app.platform}</span>
                      </p>
                    </div>
                    <span className="text-slate-400 text-xs shrink-0">
                      {expandedId === app.id ? "▲" : "▼"}
                    </span>
                  </div>
                </button>
                <div
                  className="mt-2 flex justify-end"
                  onClick={(e) => e.stopPropagation()}
                >
                  <select
                    value={app.status}
                    onChange={(e) => updateStatus(app.id, e.target.value)}
                    className="border rounded text-xs p-1.5 bg-slate-50"
                  >
                    {APPLICATION_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>
                <AnimatePresence>
                  {expandedId === app.id && (
                    <ApplicationDetail app={app} updateNotes={updateNotes} />
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
