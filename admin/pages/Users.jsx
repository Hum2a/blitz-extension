import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

export default function Users() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: profiles, error: pErr } = await supabase
        .from("admin_profiles")
        .select("user_id, email, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (pErr) {
        setError(pErr.message);
        return;
      }
      const ids = profiles.map((p) => p.user_id);
      const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("user_id", ids);
      const roleMap = Object.fromEntries((roles || []).map((r) => [r.user_id, r.role]));
      setRows(
        profiles.map((p) => ({
          ...p,
          role: roleMap[p.user_id] || "user",
        }))
      );
    })();
  }, []);

  return (
    <div>
      <h1>Users</h1>
      {error && <p className="error">{error}</p>}
      <table className="table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Role</th>
            <th>Joined</th>
            <th>User ID</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.user_id}>
              <td>{r.email || "—"}</td>
              <td>
                <span className="badge">{r.role}</span>
              </td>
              <td>{r.created_at ? new Date(r.created_at).toLocaleString() : "—"}</td>
              <td className="mono small">{r.user_id}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
