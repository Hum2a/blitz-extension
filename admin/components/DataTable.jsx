export default function DataTable({ columns, rows, rowKey = "id", emptyMessage = "No rows." }) {
  if (!rows?.length) {
    return <p className="muted">{emptyMessage}</p>;
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key || col.label}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[rowKey] ?? row.id ?? row.user_id}>
              {columns.map((col) => (
                <td key={col.key || col.label} className={col.className}>
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
