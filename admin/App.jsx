import { useEffect, useState } from "react";
import { supabase, supabaseConfigured } from "./lib/supabase.js";
import { canAccessAdmin } from "./lib/roles.js";
import Login from "./pages/Login.jsx";
import Shell from "./pages/Shell.jsx";

export default function App() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadRole(data.session.user.id);
      else setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next) loadRole(next.user.id);
      else {
        setRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadRole(userId) {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();
      if (err) throw err;
      setRole(data?.role || "user");
    } catch (e) {
      setError(e.message || "Could not load role");
      setRole("user");
    } finally {
      setLoading(false);
    }
  }

  if (!supabaseConfigured) {
    return (
      <div className="center">
        <p>Supabase not configured. Add VITE_SUPABASE_* to .env and rebuild.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="center">
        <p>Loading…</p>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  if (!canAccessAdmin(role)) {
    return (
      <div className="center">
        <div className="card login-card">
          <h1>Access denied</h1>
          <p>
            Signed in as <strong>{session.user.email}</strong> with role{" "}
            <strong>{role || "user"}</strong>. This portal is for staff with{" "}
            <strong>admin</strong> or <strong>developer</strong> only.
          </p>
          <p className="muted small">
            Roles are assigned in the database or by a developer in the Roles page — not via this
            login screen. Ask a developer to run <code>npm run db:seed:developer</code> or promote
            you after you have signed in once with Google.
          </p>
          <button type="button" className="btn" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="center">
        <p className="error">{error}</p>
        <button type="button" className="btn" onClick={() => loadRole(session.user.id)}>
          Retry
        </button>
      </div>
    );
  }

  return <Shell session={session} role={role} />;
}
