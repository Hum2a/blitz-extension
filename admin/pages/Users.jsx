import { useMemo, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { useAdminQuery } from "../hooks/useAdminQuery.js";
import PageHeader from "../components/PageHeader.jsx";
import DataTable from "../components/DataTable.jsx";
import Loading from "../components/Loading.jsx";
import Alert from "../components/Alert.jsx";
import { formatDate, formatRelative } from "../lib/format.js";

const PAGE_SIZE = 25;

export default function Users({ onOpenUser }) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);

  const { data: rows, error, loading, reload } = useAdminQuery(async () => {
    const { data, error: err } = await supabase
      .from("admin_user_summary")
      .select("*")
      .order("joined_at", { ascending: false })
      .limit(500);
    if (err) throw err;
    return data || [];
  }, []);

  const filtered = useMemo(() => {
    let list = rows || [];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.email?.toLowerCase().includes(q) || r.user_id?.toLowerCase().includes(q)
      );
    }
    if (roleFilter !== "all") {
      list = list.filter((r) => r.role === roleFilter);
    }
    if (statusFilter !== "all") {
      list = list.filter((r) => (r.account_status || "active") === statusFilter);
    }
    return list;
  }, [rows, search, roleFilter, statusFilter]);

  function exportCsv() {
    const header = [
      "email",
      "user_id",
      "role",
      "account_status",
      "tier",
      "sync_doc_count",
      "synced_app_count",
      "applications_used",
      "last_seen_at",
      "joined_at",
    ];
    const lines = filtered.map((r) =>
      header
        .map((k) => `"${String(r[k] ?? "").replace(/"/g, '""')}"`)
        .join(",")
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `blitz-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const columns = [
    {
      label: "Email",
      render: (r) => (
        <button type="button" className="link-btn" onClick={() => onOpenUser(r.user_id)}>
          {r.email || "—"}
        </button>
      ),
    },
    {
      label: "Role",
      render: (r) => <span className="badge">{r.role}</span>,
    },
    { label: "Status", key: "account_status" },
    {
      label: "Tier",
      render: (r) => r.tier || "—",
    },
    {
      label: "Sync docs",
      key: "sync_doc_count",
    },
    {
      label: "Apps",
      key: "synced_app_count",
    },
    {
      label: "Used",
      render: (r) => r.applications_used ?? "—",
    },
    {
      label: "Last seen",
      render: (r) => formatRelative(r.last_seen_at),
    },
    {
      label: "Joined",
      render: (r) => formatDate(r.joined_at),
    },
  ];

  return (
    <div>
      <PageHeader title="Users" subtitle={`${filtered.length} matching`}>
        <button type="button" className="btn small ghost" onClick={exportCsv} disabled={!filtered.length}>
          Export CSV
        </button>
        <button type="button" className="btn small" onClick={reload}>
          Refresh
        </button>
      </PageHeader>

      <div className="toolbar">
        <input
          type="search"
          placeholder="Search email or user ID…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
        />
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(0);
          }}
        >
          <option value="all">All roles</option>
          <option value="user">user</option>
          <option value="admin">admin</option>
          <option value="developer">developer</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(0);
          }}
        >
          <option value="all">All statuses</option>
          <option value="active">active</option>
          <option value="suspended">suspended</option>
        </select>
      </div>

      {loading && <Loading />}
      {error && <Alert>{error}</Alert>}
      {!loading && !error && (
        <>
          <DataTable columns={columns} rows={pageRows} rowKey="user_id" emptyMessage="No users." />
          <div className="pager">
            <button
              type="button"
              className="btn small"
              disabled={page <= 0}
              onClick={() => setPage((p) => p - 1)}
            >
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
