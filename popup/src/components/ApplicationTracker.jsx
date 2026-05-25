import { useState, Fragment } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useApplications } from "../hooks/useApplications.js";
import MatchScoreRing from "./MatchScoreRing.jsx";
import { FadeUp, PulseDots, Btn } from "./motion.jsx";

const STATUSES = ["applied", "interview", "rejected", "offer", "withdrawn"];

function exportToCsv(applications) {
  const headers = [
    "Company",
    "Role",
    "Date",
    "Platform",
    "Match Score",
    "Status",
    "URL",
    "Notes",
  ];
  const rows = applications.map((a) => [
    a.company,
    a.role,
    new Date(a.appliedAt).toISOString().slice(0, 10),
    a.platform,
    a.matchScore,
    a.status,
    a.url,
    (a.notes || "").replace(/"/g, '""'),
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell ?? ""}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `blitz-applications-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ApplicationTracker() {
  const { applications, loading, updateStatus, updateNotes } = useApplications();
  const [expandedId, setExpandedId] = useState(null);

  if (loading) {
    return (
      <div className="py-12 flex justify-center">
        <PulseDots label="Loading applications…" />
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <motion.p
        className="text-sm text-slate-600 text-center py-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        No applications yet. Approve and fill a form to log your first one.
      </motion.p>
    );
  }

  return (
    <FadeUp className="space-y-2 max-h-[440px] overflow-y-auto">
      <div className="flex justify-end">
        <Btn
          onClick={() => exportToCsv(applications)}
          className="text-xs text-blitz-600 underline bg-transparent py-0"
        >
          Export CSV
        </Btn>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-slate-500 border-b">
            <th className="py-1">Company</th>
            <th>Role</th>
            <th>Date</th>
            <th>Plat.</th>
            <th>Match</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((app, index) => (
            <Fragment key={app.id}>
              <motion.tr
                layout
                className="border-b hover:bg-white cursor-pointer"
                onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04 }}
                whileHover={{ backgroundColor: "#f8fafc" }}
              >
                <td className="py-2 pr-1 font-medium max-w-[70px] truncate">{app.company}</td>
                <td className="py-2 pr-1 truncate max-w-[60px]">{app.role}</td>
                <td className="py-2 pr-1 whitespace-nowrap">
                  {new Date(app.appliedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </td>
                <td className="py-2 capitalize">{app.platform?.slice(0, 4)}</td>
                <td className="py-2">
                  <MatchScoreRing score={app.matchScore} size={36} showLabel={false} />
                </td>
                <td className="py-2" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={app.status}
                    onChange={(e) => updateStatus(app.id, e.target.value)}
                    className="border rounded text-xs p-0.5 max-w-[68px]"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
              </motion.tr>
              <AnimatePresence>
                {expandedId === app.id && (
                  <motion.tr
                    key={`${app.id}-detail`}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <td colSpan={6} className="pb-3 text-xs text-slate-600 bg-white p-2 rounded">
                      <motion.div
                        initial={{ y: -8 }}
                        animate={{ y: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      >
                        <p className="text-slate-400 mb-2">
                          <a href={app.url} target="_blank" rel="noreferrer" className="underline">
                            View listing
                          </a>
                        </p>
                        <label className="block mb-2">
                          <span className="font-semibold">Notes</span>
                          <textarea
                            defaultValue={app.notes || ""}
                            onBlur={(e) => updateNotes(app.id, e.target.value)}
                            rows={2}
                            className="w-full border rounded p-1 mt-1 focus:ring-1 focus:ring-blitz-300"
                          />
                        </label>
                        <p className="font-semibold mb-1">CV snapshot</p>
                        <pre className="whitespace-pre-wrap max-h-24 overflow-y-auto bg-slate-50 p-1 rounded mb-2">
                          {app.cvSnapshot?.slice(0, 500)}
                          {app.cvSnapshot?.length > 500 ? "…" : ""}
                        </pre>
                        {app.coverLetterSnapshot && (
                          <>
                            <p className="font-semibold mb-1">Cover letter</p>
                            <pre className="whitespace-pre-wrap max-h-20 overflow-y-auto bg-slate-50 p-1 rounded mb-2">
                              {app.coverLetterSnapshot?.slice(0, 300)}
                            </pre>
                          </>
                        )}
                        {app.screeningAnswers?.length > 0 && (
                          <>
                            <p className="font-semibold mb-1">Screening Q&A</p>
                            <ul className="space-y-1">
                              {app.screeningAnswers.map((qa, i) => (
                                <motion.li
                                  key={i}
                                  className="bg-slate-50 p-1 rounded"
                                  initial={{ opacity: 0, x: -8 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.05 }}
                                >
                                  <span className="font-medium">{qa.question}</span>
                                  <br />
                                  {qa.answer}
                                </motion.li>
                              ))}
                            </ul>
                          </>
                        )}
                      </motion.div>
                    </td>
                  </motion.tr>
                )}
              </AnimatePresence>
            </Fragment>
          ))}
        </tbody>
      </table>
    </FadeUp>
  );
}
