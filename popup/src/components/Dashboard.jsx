export default function Dashboard({
  pendingJob,
  application,
  generating,
  license,
  onGenerate,
  onReview,
}) {
  const hasJob = Boolean(pendingJob?.jobTitle || pendingJob?.company);
  const canGenerate = hasJob && !generating && license.allowed;

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
          </div>
        ) : (
          <p className="text-sm text-slate-600">
            Open a Greenhouse job listing to get started.
          </p>
        )}
      </section>

      {application?.matchScore != null && (
        <div className="flex items-center gap-3 bg-white rounded-lg border p-4">
          <div
            className={`text-2xl font-bold ${
              application.matchScore >= 70
                ? "text-green-600"
                : application.matchScore >= 50
                  ? "text-amber-600"
                  : "text-red-600"
            }`}
          >
            {application.matchScore}%
          </div>
          <p className="text-sm text-slate-600 flex-1">{application.matchRationale}</p>
        </div>
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
          <p className="text-2xl font-bold text-blitz-700">{license.used ?? 0}</p>
          <p className="text-xs text-slate-500">Applications used</p>
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
