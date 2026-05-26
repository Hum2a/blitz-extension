import { supabase } from "../lib/supabase.js";
import { useAdminQuery } from "../hooks/useAdminQuery.js";
import PageHeader from "../components/PageHeader.jsx";
import DataTable from "../components/DataTable.jsx";
import Loading from "../components/Loading.jsx";
import Alert from "../components/Alert.jsx";
import { formatDate } from "../lib/format.js";

export default function Billing({ onOpenUser }) {
  const { data: rows, error, loading, reload } = useAdminQuery(async () => {
    const { data, error: err } = await supabase
      .from("billing_events")
      .select("*")
      .order("processed_at", { ascending: false })
      .limit(200);
    if (err) throw err;
    return data || [];
  }, []);

  return (
    <div>
      <PageHeader
        title="Billing events"
        subtitle="Lemon Squeezy webhooks (deploy lemonsqueezy-webhook Edge Function)"
      >
        <button type="button" className="btn small" onClick={reload}>
          Refresh
        </button>
      </PageHeader>
      {loading && <Loading />}
      {error && <Alert>{error}</Alert>}
      {!loading && !error && (
        <DataTable
          columns={[
            { label: "When", render: (r) => formatDate(r.processed_at) },
            { label: "Event", key: "event_name" },
            { label: "Email", key: "customer_email" },
            {
              label: "User",
              render: (r) =>
                r.user_id ? (
                  <button type="button" className="link-btn" onClick={() => onOpenUser(r.user_id)}>
                    {r.user_id.slice(0, 8)}…
                  </button>
                ) : (
                  "—"
                ),
            },
          ]}
          rows={rows}
          rowKey="id"
          emptyMessage="No billing events yet."
        />
      )}
    </div>
  );
}
