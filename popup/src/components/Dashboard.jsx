import { useMemo } from "react";
import { useApplications } from "../hooks/useApplications.js";
import MatchScoreRing from "./MatchScoreRing.jsx";
import ErrorPanel from "./ErrorPanel.jsx";

function formatCompany(company) {
  if (company == null || company === "") return null;
  const s = String(company).trim();
  if (!s || s === "true" || s === "false") return null;
  return s;
}

export default function Dashboard({
  pendingJob,
  application,
  generating,
  license,
  detecting,
  detectError,
  detectErrorDetails,
  onRefresh,
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

  const company = formatCompany(pendingJob?.company);
  const hasJob = Boolean(pendingJob?.jobTitle || pendingJob?.jobDescription || company);
  const externalApply = pendingJob?.externalApply === true;
  const linkedinNoEasyApply =
    pendingJob?.platform === "linkedin" && pendingJob?.hasEasyApply === false;
  const canGenerate =
    hasJob && !generating && !detecting && license.allowed && !externalApply && !linkedinNoEasyApply;

  return (
    <div className="space-y-4">
      <section className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Current page
          </h2>
          <button
            type="button"
            onClick={onRefresh}
            disabled={detecting}
            className="text-xs text-blitz-600 underline disabled:opacity-50"
          >
            {detecting ? "Reading…" : "Refresh"}
          </button>
        </div>

        {detectError && (
          <div className="mb-2">
            <ErrorPanel
              title="Could not read this page"
              error={detectError}
              details={detectErrorDetails}
            />
          </div>
        )}

        {detecting && !pendingJob && (
          <p className="text-sm text-slate-500">Reading job from this tab…</p>
        )}

        {hasJob && !detecting ? (
          <div>
            <p className="font-medium text-slate-900">
              {pendingJob.jobTitle || "Job listing"}
            </p>
            {company && <p className="text-sm text-slate-600 mt-0.5">{company}</p>}
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-xs bg-blitz-100 text-blitz-700 px-2 py-0.5 rounded capitalize">
                {pendingJob.platform}
              </span>
              {pendingJob.applyType && (
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                  {pendingJob.applyType === "external" ? "External apply" : "Indeed apply"}
                </span>
              )}
            </div>
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
        ) : !detecting && !detectError ? (
          <p className="text-sm text-slate-600">
            Open a job on Greenhouse, LinkedIn, Indeed, or Workday, then click Refresh.
          </p>
        ) : null}
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
