import { listVersions } from "../lib/application-versions.js";

export default function ApplicationVersionsBar({
  versions,
  activeVersionId,
  hasLatestSnapshot,
  onRestoreLatest,
  onRestore,
  onCompare,
}) {
  const items = listVersions({ versions });
  if (!items.length && !hasLatestSnapshot) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-700">
          Saved versions ({items.length})
        </p>
        <p className="text-[10px] text-slate-500">
          Regenerating keeps prior drafts here — nothing is overwritten.
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {hasLatestSnapshot && (
          <button
            type="button"
            onClick={onRestoreLatest}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              !activeVersionId
                ? "bg-blitz-600 text-white border-blitz-600"
                : "bg-white text-slate-700 border-slate-300 hover:border-blitz-400"
            }`}
          >
            Latest AI
          </button>
        )}
        {items.map((v, index) => (
          <button
            key={v.id}
            type="button"
            title={v.label}
            onClick={() => onRestore(v.id)}
            className={`text-xs px-2.5 py-1 rounded-full border max-w-[200px] truncate transition-colors ${
              activeVersionId === v.id
                ? "bg-blitz-600 text-white border-blitz-600"
                : "bg-white text-slate-700 border-slate-300 hover:border-blitz-400"
            }`}
          >
            v{index + 1}
          </button>
        ))}
      </div>
      {activeVersionId && (
        <p className="text-[10px] text-amber-800">
          Viewing an older version — edits apply to this copy. Use Compare or switch back to
          Current.
        </p>
      )}
      {items.length > 0 && (
        <button
          type="button"
          onClick={onCompare}
          className="text-xs text-blitz-700 underline hover:text-blitz-800"
        >
          Compare versions side by side
        </button>
      )}
    </div>
  );
}
