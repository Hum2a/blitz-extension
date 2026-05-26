import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { canManageRoles } from "../lib/roles.js";

export default function Licenses({ role }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);

  async function load() {
    const { data, error: err } = await supabase
      .from("license_entitlements")
      .select("user_id, tier, source, applications_used, expires_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(200);
    if (err) setError(err.message);
    else setRows(data || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function setTier(userId, tier) {
    setBusy(userId);
    const { error: err } = await supabase
      .from("license_entitlements")
      .upsert(
        {
          user_id: userId,
          tier,
          source: "admin_dashboard",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    if (err) setError(err.message);
    else {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("admin_audit_log").insert({
        actor_id: user?.id,
        action: "license_tier_change",
        target_user_id: userId,
        meta: { tier },
      });
      await load();
    }
    setBusy(null);
  }

  return (
    <div>
      <h1>Licenses</h1>
      {error && <p className="error">{error}</p>}
      <table className="table">
        <thead>
          <tr>
            <th>User</th>
            <th>Tier</th>
            <th>Used</th>
            <th>Source</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.user_id}>
              <td className="mono small">{r.user_id}</td>
              <td>{r.tier}</td>
              <td>{r.applications_used}</td>
              <td>{r.source}</td>
              <td className="actions">
                <button
                  type="button"
                  className="btn small"
                  disabled={busy === r.user_id}
                  onClick={() => setTier(r.user_id, "pro")}
                >
                  Set Pro
                </button>
                <button
                  type="button"
                  className="btn small ghost"
                  disabled={busy === r.user_id}
                  onClick={() => setTier(r.user_id, "free")}
                >
                  Set Free
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {canManageRoles(role) && (
        <p className="muted small">Developers can delete license rows via SQL if needed.</p>
      )}
    </div>
  );
}
