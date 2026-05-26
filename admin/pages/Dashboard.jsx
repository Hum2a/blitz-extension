import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [profiles, licenses, docs, apps, audit] = await Promise.all([
          supabase.from("admin_profiles").select("user_id", { count: "exact", head: true }),
          supabase.from("license_entitlements").select("user_id", { count: "exact", head: true }),
          supabase.from("sync_documents").select("id", { count: "exact", head: true }),
          supabase.from("synced_applications").select("id", { count: "exact", head: true }),
          supabase
            .from("admin_audit_log")
            .select("id", { count: "exact", head: true })
            .gte("created_at", new Date(Date.now() - 7 * 864e5).toISOString()),
        ]);
        const err = profiles.error || licenses.error || docs.error || apps.error || audit.error;
        if (err) throw err;
        if (!cancelled) {
          setStats({
            users: profiles.count ?? 0,
            licenses: licenses.count ?? 0,
            syncDocs: docs.count ?? 0,
            syncApps: apps.count ?? 0,
            auditWeek: audit.count ?? 0,
          });
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <p className="muted">
        Encrypted user content (CV/profile) is not visible here — only metadata and entitlements.
      </p>
      {error && <p className="error">{error}</p>}
      {stats && (
        <div className="grid">
          <Stat label="Registered users" value={stats.users} />
          <Stat label="License rows" value={stats.licenses} />
          <Stat label="Sync documents (encrypted)" value={stats.syncDocs} />
          <Stat label="Synced applications (encrypted)" value={stats.syncApps} />
          <Stat label="Admin actions (7d)" value={stats.auditWeek} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
