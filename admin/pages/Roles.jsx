import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { ROLES } from "../lib/roles.js";

export default function Roles({ session }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);

  async function load() {
    const { data: roles, error: rErr } = await supabase
      .from("user_roles")
      .select("user_id, role, granted_at, updated_at")
      .order("updated_at", { ascending: false });
    if (rErr) {
      setError(rErr.message);
      return;
    }
    const ids = roles.map((r) => r.user_id);
    const { data: profiles } = await supabase
      .from("admin_profiles")
      .select("user_id, email, allow_email_login")
      .in("user_id", ids);
    const profileMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p]));
    setRows(
      roles.map((r) => ({
        ...r,
        email: profileMap[r.user_id]?.email,
        allow_email_login: Boolean(profileMap[r.user_id]?.allow_email_login),
      }))
    );
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleEmailLogin(userId, enabled) {
    setBusy(userId);
    setError(null);
    const { error: err } = await supabase
      .from("admin_profiles")
      .update({ allow_email_login: enabled })
      .eq("user_id", userId);
    if (err) setError(err.message);
    else {
      await supabase.from("admin_audit_log").insert({
        actor_id: session.user.id,
        action: "admin_email_login",
        target_user_id: userId,
        meta: { allow_email_login: enabled },
      });
      await load();
    }
    setBusy(null);
  }

  async function assignRole(userId, role) {
    if (userId === session.user.id && role !== "developer") {
      setError("You cannot demote yourself below developer.");
      return;
    }
    setBusy(userId);
    setError(null);
    const { error: err } = await supabase.from("user_roles").upsert(
      {
        user_id: userId,
        role,
        granted_by: session.user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (err) setError(err.message);
    else {
      await supabase.from("admin_audit_log").insert({
        actor_id: session.user.id,
        action: "role_change",
        target_user_id: userId,
        meta: { role },
      });
      await load();
    }
    setBusy(null);
  }

  return (
    <div>
      <h1>Roles</h1>
      <p className="muted">Developer only. Hierarchy: user &lt; admin &lt; developer.</p>
      {error && <p className="error">{error}</p>}
      <table className="table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Role</th>
            <th>Assign</th>
            <th>Email login</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.user_id}>
              <td>{r.email || r.user_id}</td>
              <td>
                <span className="badge">{r.role}</span>
              </td>
              <td className="actions">
                {ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    className={r.role === role ? "btn small primary" : "btn small"}
                    disabled={busy === r.user_id || r.role === role}
                    onClick={() => assignRole(r.user_id, role)}
                  >
                    {role}
                  </button>
                ))}
              </td>
              <td>
                {r.role === "developer" ? (
                  <button
                    type="button"
                    className={r.allow_email_login ? "btn small primary" : "btn small"}
                    disabled={busy === r.user_id}
                    onClick={() => toggleEmailLogin(r.user_id, !r.allow_email_login)}
                  >
                    {r.allow_email_login ? "Email on" : "Email off"}
                  </button>
                ) : (
                  <span className="muted small">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
