import { supabase } from "../lib/supabase.js";
import { useAdminQuery } from "../hooks/useAdminQuery.js";
import PageHeader from "../components/PageHeader.jsx";
import StatCard from "../components/StatCard.jsx";
import BarChart from "../components/BarChart.jsx";
import Loading from "../components/Loading.jsx";
import Alert from "../components/Alert.jsx";

export default function Dashboard() {
  const { data: stats, error, loading } = useAdminQuery(async () => {
    const { data, error: err } = await supabase.rpc("admin_stats_overview");
    if (err) throw err;
    return data;
  }, []);

  if (loading) return <Loading />;
  if (error) return <Alert>{error}</Alert>;

  const pro = stats?.pro_vs_free?.pro ?? 0;
  const free = stats?.pro_vs_free?.free ?? 0;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Metadata and entitlements only — encrypted CV and applications are not visible."
      />

      <div className="grid">
        <StatCard label="Registered users" value={stats.total_users} />
        <StatCard label="Suspended" value={stats.suspended_users ?? 0} />
        <StatCard label="Pro licenses" value={pro} />
        <StatCard label="Cloud sync enabled" value={stats.sync_enabled_users} />
        <StatCard label="Synced applications" value={stats.total_synced_apps} />
        <StatCard label="Active (7d)" value={stats.active_7d} hint="Extension heartbeat" />
        <StatCard label="Admin actions (7d)" value={stats.audit_actions_7d} />
      </div>

      <section className="section">
        <h2>Signups (30 days)</h2>
        <BarChart data={stats.signups_by_day} labelKey="day" valueKey="count" />
      </section>

      <div className="two-col">
        <section className="section">
          <h2>License mix</h2>
          <ul className="kv-list">
            <li>
              <span>Pro</span>
              <strong>{pro}</strong>
            </li>
            <li>
              <span>Free</span>
              <strong>{free}</strong>
            </li>
            <li>
              <span>No license row</span>
              <strong>{stats.pro_vs_free?.none ?? 0}</strong>
            </li>
          </ul>
        </section>
        <section className="section">
          <h2>Sync health (niche)</h2>
          <ul className="kv-list">
            <li>
              <span>Stale sync (&gt;7d)</span>
              <strong>{stats.stale_sync_users}</strong>
            </li>
            <li>
              <span>Sync on, 0 apps</span>
              <strong>{stats.sync_no_apps}</strong>
            </li>
            <li>
              <span>Sync documents</span>
              <strong>{stats.total_sync_docs}</strong>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
