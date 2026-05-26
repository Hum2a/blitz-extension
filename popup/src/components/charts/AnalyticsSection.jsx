export function StatPill({ label, value, hint }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-center min-w-[4.5rem]">
      <p className="text-lg font-bold text-slate-900 tabular-nums">{value}</p>
      <p className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</p>
      {hint && <p className="text-[9px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}

export default function AnalyticsSection({ title, description, children, className = "" }) {
  return (
    <section className={`bg-white border border-slate-200 rounded-xl p-4 shadow-sm ${className}`}>
      <header className="mb-3">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </header>
      {children}
    </section>
  );
}

export function SimpleTable({ columns, rows, rowKey = "id" }) {
  if (!rows?.length) {
    return <p className="text-sm text-slate-500 py-3 text-center">No rows.</p>;
  }
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-500">
            {columns.map((col) => (
              <th key={col.key} className="py-2 px-2 font-semibold whitespace-nowrap">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row[rowKey] ?? i}
              className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors"
            >
              {columns.map((col) => (
                <td key={col.key} className="py-2 px-2 text-slate-700 max-w-[140px] truncate">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
