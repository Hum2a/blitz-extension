import { useState } from "react";
import { supabase } from "../lib/supabase.js";
import { canManageRoles } from "../lib/roles.js";
import Dashboard from "./Dashboard.jsx";
import Users from "./Users.jsx";
import Licenses from "./Licenses.jsx";
import Roles from "./Roles.jsx";

const NAV = [
  { id: "dashboard", label: "Dashboard" },
  { id: "users", label: "Users" },
  { id: "licenses", label: "Licenses" },
  { id: "roles", label: "Roles", developerOnly: true },
];

export default function Shell({ session, role }) {
  const [page, setPage] = useState("dashboard");
  const items = NAV.filter((n) => !n.developerOnly || canManageRoles(role));

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">Blitz Admin</div>
        <p className="muted small">{session.user.email}</p>
        <p className="badge">{role}</p>
        <nav>
          {items.map((n) => (
            <button
              key={n.id}
              type="button"
              className={page === n.id ? "nav active" : "nav"}
              onClick={() => setPage(n.id)}
            >
              {n.label}
            </button>
          ))}
        </nav>
        <button type="button" className="btn ghost" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </aside>
      <main className="main">
        {page === "dashboard" && <Dashboard />}
        {page === "users" && <Users />}
        {page === "licenses" && <Licenses role={role} />}
        {page === "roles" && canManageRoles(role) && <Roles session={session} />}
      </main>
    </div>
  );
}
