import { supabase } from "../lib/supabase.js";
import { useAdminQuery } from "../hooks/useAdminQuery.js";
import PageHeader from "../components/PageHeader.jsx";
import DataTable from "../components/DataTable.jsx";
import Loading from "../components/Loading.jsx";
import Alert from "../components/Alert.jsx";
import { formatDate, formatRelative } from "../lib/format.js";

export default function Staff({ onOpenUser }) {
  const { data: rows, error, loading, reload } = useAdminQuery(async () => {
    const { data, error: err } = await supabase
      .from("admin_user_summary")
      .select("*")
      .in("role", ["admin", "developer"])
      .order("role", { ascending: false });
    if (err) throw err;
    return data || [];
  }, []);

  return (
    <div>
      <PageHeader title="Staff" subtitle="Admin and developer accounts">
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
                  {r.email}
                </button>
              ),
            },
            { label: "Role", render: (r) => <span className="badge">{r.role}</span> },
            { label: "Email OTP", render: (r) => (r.allow_email_login ? "on" : "off") },
            { label: "Last seen", render: (r) => formatRelative(r.last_seen_at) },
            { label: "Joined", render: (r) => formatDate(r.joined_at) },
          ]}
          rows={rows}
          rowKey="user_id"
        />
      )}
    </div>
  );
}
