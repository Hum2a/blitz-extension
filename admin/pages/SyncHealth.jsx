import { supabase } from "../lib/supabase.js";
import { useAdminQuery } from "../hooks/useAdminQuery.js";
import PageHeader from "../components/PageHeader.jsx";
import DataTable from "../components/DataTable.jsx";
import Loading from "../components/Loading.jsx";
import Alert from "../components/Alert.jsx";
import { formatDate } from "../lib/format.js";

export default function SyncHealth({ onOpenUser }) {
  const { data: rows, error, loading, reload } = useAdminQuery(async () => {
    const { data, error: err } = await supabase
      .from("admin_user_summary")
      .select("*")
      .eq("has_sync_meta", true)
      .order("sync_meta_updated_at", { ascending: false, nullsFirst: true })
      .limit(300);
    if (err) throw err;
    return (data || []).filter(
      (r) =>
        r.sync_last_error ||
        !r.last_full_sync_at ||
        (r.has_sync_meta && r.synced_app_count === 0)
    );
  }, []);

  return (
    <div>
      <PageHeader title="Sync health" subtitle="Errors, stale sync, and edge cases">
        <button type="button" className="btn small" onClick={reload}>
          Refresh
        </button>
      </PageHeader>
      {loading && <Loading />}
      {error && <Alert>{error}</Alert>}
      {!loading && !error && (
        <DataTable
          columns={[
            {
              label: "Email",
              render: (r) => (
                <button type="button" className="link-btn" onClick={() => onOpenUser(r.user_id)}>
                  {r.email || r.user_id}
                </button>
              ),
            },
            { label: "Status", key: "account_status" },
            { label: "Last error", render: (r) => r.sync_last_error || "—" },
            { label: "Last full sync", render: (r) => formatDate(r.last_full_sync_at) },
            { label: "Docs", key: "sync_doc_count" },
            { label: "Apps", key: "synced_app_count" },
          ]}
          rows={rows}
          rowKey="user_id"
          emptyMessage="No sync issues detected."
        />
      )}
    </div>
  );
}
