import { useState, Fragment } from "react";
import { useApplications } from "../hooks/useApplications.js";

const STATUSES = ["applied", "interview", "rejected", "offer", "withdrawn"];

export default function ApplicationTracker() {
  const { applications, loading, updateStatus } = useApplications();
  const [expandedId, setExpandedId] = useState(null);

  if (loading) {
    return <p className="text-sm text-slate-500">Loading applications…</p>;
  }

  if (applications.length === 0) {
    return (
      <p className="text-sm text-slate-600 text-center py-8">
        No applications yet. Approve and fill a form to log your first one.
      </p>
    );
  }

  return (
    <div className="space-y-2 max-h-[440px] overflow-y-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-slate-500 border-b">
            <th className="py-1">Company</th>
            <th>Role</th>
            <th>Match</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((app) => (
            <Fragment key={app.id}>
              <tr
                className="border-b hover:bg-white cursor-pointer"
                onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
              >
                <td className="py-2 pr-1 font-medium">{app.company}</td>
                <td className="py-2 pr-1 truncate max-w-[80px]">{app.role}</td>
                <td className="py-2">{app.matchScore}%</td>
                <td className="py-2" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={app.status}
                    onChange={(e) => updateStatus(app.id, e.target.value)}
                    className="border rounded text-xs p-0.5 max-w-[72px]"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
              {expandedId === app.id && (
                <tr key={`${app.id}-detail`}>
                  <td colSpan={4} className="pb-3 text-xs text-slate-600 bg-white p-2 rounded">
                    <p className="text-slate-400 mb-1">
                      {new Date(app.appliedAt).toLocaleDateString()} · {app.platform}
                    </p>
                    <p className="font-semibold mb-1">CV snapshot</p>
                    <pre className="whitespace-pre-wrap max-h-24 overflow-y-auto bg-slate-50 p-1 rounded mb-2">
                      {app.cvSnapshot?.slice(0, 500)}
                      {app.cvSnapshot?.length > 500 ? "…" : ""}
                    </pre>
                    {app.coverLetterSnapshot && (
                      <>
                        <p className="font-semibold mb-1">Cover letter</p>
                        <pre className="whitespace-pre-wrap max-h-20 overflow-y-auto bg-slate-50 p-1 rounded">
                          {app.coverLetterSnapshot?.slice(0, 300)}
                        </pre>
                      </>
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
