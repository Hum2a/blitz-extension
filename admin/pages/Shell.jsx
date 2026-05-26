import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { canManageRoles, canManageConfig } from "../lib/roles.js";
import Dashboard from "./Dashboard.jsx";
import Users from "./Users.jsx";
import UserDetail from "./UserDetail.jsx";
import Licenses from "./Licenses.jsx";
import Roles from "./Roles.jsx";
import Audit from "./Audit.jsx";
import Analytics from "./Analytics.jsx";
import Staff from "./Staff.jsx";
import SyncHealth from "./SyncHealth.jsx";
import Privacy from "./Privacy.jsx";
import Config from "./Config.jsx";
import Billing from "./Billing.jsx";

const NAV = [
  { id: "dashboard", label: "Dashboard" },
  { id: "analytics", label: "Analytics" },
  { id: "users", label: "Users" },
  { id: "licenses", label: "Licenses" },
  { id: "sync-health", label: "Sync health" },
  { id: "staff", label: "Staff" },
  { id: "billing", label: "Billing" },
  { id: "audit", label: "Audit log" },
  { id: "privacy", label: "Privacy" },
  { id: "config", label: "Config", developerOnly: true },
  { id: "roles", label: "Roles", developerOnly: true },
];

export default function Shell({ session, role }) {
  const [page, setPage] = useState("dashboard");
  const [userId, setUserId] = useState(null);

  const items = NAV.filter((n) => {
    if (n.developerOnly && !canManageRoles(role) && n.id !== "config") return false;
    if (n.id === "config" && !canManageConfig(role)) return false;
    return true;
  });

  useEffect(() => {
    supabase.rpc("touch_admin_last_seen").then(() => {});
  }, []);

  function openUser(id) {
    setUserId(id);
    setPage("user-detail");
  }

  function navigate(id) {
    setPage(id);
    if (id !== "user-detail") setUserId(null);
  }

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
              className={
                page === n.id || (page === "user-detail" && n.id === "users")
                  ? "nav active"
                  : "nav"
              }
              onClick={() => navigate(n.id)}
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
        {page === "analytics" && <Analytics onOpenUser={openUser} />}
        {page === "users" && <Users onOpenUser={openUser} />}
        {page === "user-detail" && userId && (
          <UserDetail
            userId={userId}
            staffRole={role}
            onBack={() => navigate("users")}
            onDeleted={() => navigate("users")}
          />
        )}
        {page === "licenses" && <Licenses onOpenUser={openUser} />}
        {page === "sync-health" && <SyncHealth onOpenUser={openUser} />}
        {page === "staff" && <Staff onOpenUser={openUser} />}
        {page === "billing" && <Billing onOpenUser={openUser} />}
        {page === "audit" && <Audit />}
        {page === "privacy" && <Privacy />}
        {page === "config" && canManageConfig(role) && <Config />}
        {page === "roles" && canManageRoles(role) && <Roles session={session} />}
      </main>
    </div>
  );
}
