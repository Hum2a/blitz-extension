const PALETTE = [
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#16a34a",
  "#0891b2",
  "#4f46e5",
  "#ca8a04",
  "#64748b",
];

export default function DonutChart({ segments, size = 96 }) {
  const items = (segments || []).filter((s) => s.count > 0);
  if (!items.length) {
    return <p className="text-sm text-slate-500 py-4 text-center">No data yet.</p>;
  }

  const total = items.reduce((s, x) => s + x.count, 0);
  let acc = 0;
  const stops = items.map((seg, i) => {
    const pct = (seg.count / total) * 100;
    const start = acc;
    acc += pct;
    const color = seg.color || PALETTE[i % PALETTE.length];
    return `${color} ${start}% ${acc}%`;
  });

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div
        className="relative shrink-0 rounded-full"
        style={{
          width: size,
          height: size,
          background: `conic-gradient(${stops.join(", ")})`,
        }}
        aria-hidden
      >
        <div
          className="absolute inset-[18%] rounded-full bg-white"
          title={`Total: ${total}`}
        />
      </div>
      <ul className="text-xs space-y-1 min-w-[120px] flex-1">
        {items.map((seg, i) => (
          <li key={seg.label} className="flex justify-between gap-2">
            <span className="flex items-center gap-1.5 text-slate-700 truncate">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: seg.color || PALETTE[i % PALETTE.length] }}
              />
              {seg.label}
            </span>
            <span className="text-slate-500 tabular-nums shrink-0">
              {seg.count}{" "}
              <span className="text-slate-400">({Math.round((seg.count / total) * 100)}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
