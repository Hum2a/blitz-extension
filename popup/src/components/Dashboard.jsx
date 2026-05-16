import { useMemo } from "react";
import { useApplications } from "../hooks/useApplications.js";
import MatchScoreRing from "./MatchScoreRing.jsx";

export default function Dashboard({
  pendingJob,
  application,
  generating,
  license,
  onGenerate,
  onReview,
}) {
  const { applications } = useApplications();

  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thisWeek = applications.filter(
      (a) => new Date(a.appliedAt).getTime() >= weekAgo
    );
    const applied = applications.filter((a) => a.status === "applied").length;
    const positive = applications.filter((a) =>
      ["interview", "offer"].includes(a.status)
    ).length;
    const responseRate =
      applied > 0 ? Math.round((positive / applications.length) * 100) : 0;
    return { thisWeek: thisWeek.length, responseRate };
  }, [applications]);

  const hasJob = Boolean(pendingJob?.jobTitle || pendingJob?.company);
  const externalApply = pendingJob?.externalApply;
  const linkedinNoEasyApply =
    pendingJob?.platform === "linkedin" && pendingJob?.hasEasyApply === false;
  const canGenerate =
    hasJob && !generating && license.allowed && !externalApply && !linkedinNoEasyApply;

  return (
    <div className="space-y-4">
      <section className="bg-white rounded-lg border border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
          Current page
        </h2>
        {hasJob ? (
          <div>
            <p className="font-medium text-slate-900">{pendingJob.jobTitle}</p>
            <p className="text-sm text-slate-600">{pendingJob.company}</p>
            <span className="inline-block mt-2 text-xs bg-blitz-100 text-blitz-700 px-2 py-0.5 rounded capitalize">
              {pendingJob.platform}
            </span>
            {externalApply && (
              <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                Applies on company site — Blitz cannot auto-fill this role.
              </p>
            )}
            {linkedinNoEasyApply && (
              <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                No Easy Apply on this listing.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-600">
            Open a job on Greenhouse, LinkedIn, Indeed, or Workday to get started.
          </p>
        )}
      </section>

      {application?.matchScore != null && (
        <section className="bg-white rounded-lg border p-4">
          <MatchScoreRing
            score={application.matchScore}
            rationale={application.matchRationale}
            size={80}
          />
        </section>
      )}

      <div className="flex flex-col gap-2">
        {application ? (
          <button
            type="button"
            onClick={onReview}
            className="w-full bg-blitz-600 hover:bg-blitz-700 text-white font-medium py-2.5 rounded-lg transition"
          >
            Review application
          </button>
        ) : null}
        <button
          type="button"
          onClick={onGenerate}
          disabled={!canGenerate}
          className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-medium py-2.5 rounded-lg transition"
        >
          {generating ? "Generating…" : "Generate tailored application"}
        </button>
      </div>

      <section className="grid grid-cols-2 gap-3 text-center">
        <div className="bg-white rounded-lg border p-3">
          <p className="text-2xl font-bold text-blitz-700">{stats.thisWeek}</p>
          <p className="text-xs text-slate-500">This week</p>
        </div>
        <div className="bg-white rounded-lg border p-3">
          <p className="text-2xl font-bold text-blitz-700">{stats.responseRate}%</p>
          <p className="text-xs text-slate-500">Response rate</p>
        </div>
        <div className="bg-white rounded-lg border p-3">
          <p className="text-2xl font-bold text-blitz-700">{license.used ?? 0}</p>
          <p className="text-xs text-slate-500">Total used</p>
        </div>
        <div className="bg-white rounded-lg border p-3">
          <p className="text-2xl font-bold text-blitz-700">
            {license.remaining === Infinity ? "∞" : license.remaining}
          </p>
          <p className="text-xs text-slate-500">Remaining (free)</p>
        </div>
      </section>
    </div>
  );
}
