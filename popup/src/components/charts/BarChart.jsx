/** CSS bar chart — no external chart library. */
export default function BarChart({
  data,
  labelKey = "day",
  valueKey = "count",
  maxBars = 30,
  formatLabel = (v) => String(v).slice(5),
}) {
  const items = (data || []).slice(-maxBars);
  if (!items.length) {
    return <p className="text-sm text-slate-500 py-4 text-center">No data for this period.</p>;
  }

  const max = Math.max(...items.map((d) => Number(d[valueKey]) || 0), 1);

  return (
    <div className="space-y-1" role="img" aria-label="Bar chart">
      {items.map((item) => {
        const val = Number(item[valueKey]) || 0;
        const pct = Math.round((val / max) * 100);
        const label = item[labelKey];
        return (
          <div key={String(label)} className="grid grid-cols-[52px_1fr_36px] gap-2 items-center text-xs">
            <span className="text-slate-500 truncate" title={String(label)}>
              {formatLabel(label)}
            </span>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blitz-500 rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-right text-slate-700 tabular-nums font-medium">{val}</span>
          </div>
        );
      })}
    </div>
  );
}
