import { useMemo, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { useAdminQuery } from "../hooks/useAdminQuery.js";
import PageHeader from "../components/PageHeader.jsx";
import DataTable from "../components/DataTable.jsx";
import Loading from "../components/Loading.jsx";
import Alert from "../components/Alert.jsx";
import { formatDate } from "../lib/format.js";

const PAGE_SIZE = 50;

export default function Audit() {
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(0);

  const { data: rows, error, loading, reload } = useAdminQuery(async () => {
    const { data, error: err } = await supabase
      .from("admin_audit_log")
      .select("id, action, actor_id, target_user_id, meta, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (err) throw err;
    return data || [];
  }, []);

  const actions = useMemo(() => {
    const set = new Set((rows || []).map((r) => r.action));
    return [...set].sort();
  }, [rows]);

  const filtered = useMemo(() => {
    if (!actionFilter) return rows || [];
    return (rows || []).filter((r) => r.action === actionFilter);
  }, [rows, actionFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function exportCsv() {
    const header = ["created_at", "action", "actor_id", "target_user_id", "meta"];
    const lines = filtered.map((r) =>
      [
        r.created_at,
        r.action,
        r.actor_id,
        r.target_user_id,
        JSON.stringify(r.meta || {}),
      ]
        .map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`)
        .join(",")
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `blitz-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <div>
      <PageHeader title="Audit log" subtitle="Staff actions on users and licenses">
        <button type="button" className="btn small" onClick={reload}>
          Refresh
        </button>
        <button type="button" className="btn small ghost" onClick={exportCsv} disabled={!filtered.length}>
          Export CSV
        </button>
      </PageHeader>

      <div className="toolbar">
        <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}>
          <option value="">All actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {loading && <Loading />}
      {error && <Alert>{error}</Alert>}
      {!loading && !error && (
        <>
          <DataTable
            columns={[
              { label: "When", render: (r) => formatDate(r.created_at) },
              { label: "Action", key: "action" },
              { label: "Actor", render: (r) => r.actor_id?.slice(0, 8) + "…", className: "mono small" },
              { label: "Target", render: (r) => r.target_user_id?.slice(0, 8) + "…" || "—", className: "mono small" },
              { label: "Meta", render: (r) => <span className="small">{JSON.stringify(r.meta)}</span> },
            ]}
            rows={pageRows}
            rowKey="id"
          />
          <div className="pager">
            <button type="button" className="btn small" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <span className="muted small">
              Page {page + 1} / {pageCount}
            </span>
            <button
              type="button"
              className="btn small"
              disabled={page >= pageCount - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
