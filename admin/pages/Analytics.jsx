import { supabase } from "../lib/supabase.js";
import { useAdminQuery } from "../hooks/useAdminQuery.js";
import PageHeader from "../components/PageHeader.jsx";
import StatCard from "../components/StatCard.jsx";
import BarChart from "../components/BarChart.jsx";
import DataTable from "../components/DataTable.jsx";
import Loading from "../components/Loading.jsx";
import Alert from "../components/Alert.jsx";

export default function Analytics({ onOpenUser }) {
  const { data: stats, error, loading, reload } = useAdminQuery(async () => {
    const { data, error: err } = await supabase.rpc("admin_stats_overview");
    if (err) throw err;
    return data;
  }, []);

  const { data: auditTrends } = useAdminQuery(async () => {
    const { data, error: err } = await supabase.rpc("admin_audit_trends");
    if (err) throw err;
    return data;
  }, []);

  const { data: expiring } = useAdminQuery(async () => {
    const { data, error: err } = await supabase.rpc("admin_licenses_expiring", { p_days: 30 });
    if (err) throw err;
    return data;
  }, []);

  if (loading) return <Loading />;
  if (error) return <Alert>{error}</Alert>;

  const syncRate =
    stats.total_users > 0
      ? Math.round((stats.sync_enabled_users / stats.total_users) * 100)
      : 0;

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Aggregated metadata — no decrypted user content."
      >
        <button type="button" className="btn small" onClick={reload}>
          Refresh
        </button>
      </PageHeader>

      <div className="grid">
        <StatCard label="Total users" value={stats.total_users} />
        <StatCard label="Sync adoption" value={`${syncRate}%`} hint={`${stats.sync_enabled_users} with sync meta`} />
        <StatCard label="Active 30d" value={stats.active_30d} />
        <StatCard label="Active 7d" value={stats.active_7d} />
        <StatCard label="Total sync docs" value={stats.total_sync_docs} />
        <StatCard label="Total synced apps" value={stats.total_synced_apps} />
        <StatCard label="Telemetry (7d)" value={stats.telemetry_7d ?? 0} />
        <StatCard label="Sync errors" value={stats.sync_errors ?? 0} />
      </div>

      <section className="section">
        <h2>Signup trend (30d)</h2>
        <BarChart data={stats.signups_by_day} labelKey="day" valueKey="count" />
      </section>

      <div className="two-col">
        <section className="section">
          <h2>Document keys in cloud</h2>
          <p className="muted small">Which settings users sync most (encrypted blobs).</p>
          <DataTable
            columns={[
              { label: "doc_key", key: "doc_key" },
              { label: "Users/docs", key: "count" },
            ]}
            rows={stats.doc_keys || []}
            rowKey="doc_key"
          />
        </section>
        <section className="section">
          <h2>Niche health signals</h2>
          <ul className="kv-list">
            <li>
              <span>Stale sync (&gt;7 days)</span>
              <strong>{stats.stale_sync_users}</strong>
            </li>
            <li>
              <span>Has sync meta, 0 applications</span>
              <strong>{stats.sync_no_apps}</strong>
            </li>
            <li>
              <span>Pro tier</span>
              <strong>{stats.pro_vs_free?.pro}</strong>
            </li>
            <li>
              <span>Free tier rows</span>
              <strong>{stats.pro_vs_free?.free}</strong>
            </li>
          </ul>
        </section>
      </div>

      <section className="section">
        <h2>Top users by synced applications</h2>
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
            { label: "Count", key: "synced_app_count" },
          ]}
          rows={stats.top_by_synced_apps || []}
          rowKey="user_id"
        />
      </section>

      <section className="section">
        <h2>Client events (7d)</h2>
        <DataTable
          columns={[
            { label: "event_type", key: "event_type" },
            { label: "count", key: "count" },
          ]}
          rows={stats.events_by_type || []}
          rowKey="event_type"
          emptyMessage="No telemetry yet — extension records events when signed in."
        />
      </section>

      <div className="two-col">
        <section className="section">
          <h2>Admin actions (30d)</h2>
          <DataTable
            columns={[
              { label: "action", key: "action" },
              { label: "count", key: "count" },
            ]}
            rows={auditTrends?.by_action || []}
            rowKey="action"
          />
        </section>
        <section className="section">
          <h2>Audit volume by week</h2>
          <BarChart data={auditTrends?.by_week || []} labelKey="week" valueKey="count" />
        </section>
      </div>

      <section className="section">
        <h2>Licenses expiring (30d)</h2>
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
            { label: "Tier", key: "tier" },
            { label: "Expires", render: (r) => r.license_expires_at },
          ]}
          rows={expiring || []}
          rowKey="user_id"
          emptyMessage="No upcoming expirations."
        />
      </section>

      <section className="section">
        <h2>Top users by free-tier applications used</h2>
        <p className="muted small">From license_entitlements.applications_used (local+synced counter).</p>
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
            { label: "Used", key: "applications_used" },
          ]}
          rows={stats.top_by_applications_used || []}
          rowKey="user_id"
        />
      </section>
    </div>
  );
}
