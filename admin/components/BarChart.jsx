/** Simple CSS bar chart — no chart library. */
export default function BarChart({ data, labelKey = "day", valueKey = "count", maxBars = 30 }) {
  const items = (data || []).slice(-maxBars);
  if (!items.length) return <p className="muted">No data yet.</p>;

  const max = Math.max(...items.map((d) => Number(d[valueKey]) || 0), 1);

  return (
    <div className="bar-chart" role="img" aria-label="Bar chart">
      {items.map((item) => {
        const val = Number(item[valueKey]) || 0;
        const pct = Math.round((val / max) * 100);
        const label = item[labelKey];
        return (
          <div key={String(label)} className="bar-row" title={`${label}: ${val}`}>
            <span className="bar-label">{String(label).slice(5)}</span>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="bar-val">{val}</span>
          </div>
        );
      })}
    </div>
  );
}
